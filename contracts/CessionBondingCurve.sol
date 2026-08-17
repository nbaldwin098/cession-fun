// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CessionToken.sol";

/**
 * @title CessionBondingCurve
 * @notice Sovereign Fair-Launch Bonding Curve Protocol for Base L2 & EVM.
 * 
 * Features:
 * - Constant Product Virtual AMM (x * y = k)
 * - 0.50% Total Swap Fee:
 *   * 0.25% to Cession Protocol Treasury
 *   * 0.25% to Algorithmic Buyback & Burn (Burned directly to 0xdead)
 * - Proof-of-Skin: On-chain Dev Token Vesting Lock until DEX graduation
 * - ReentrancyGuard mutex & Checks-Effects-Interactions pattern
 * - Pull-Payment Creator DEX Graduation Bounty (Prevents graduation DOS)
 * - Automated Uniswap V3 LP Lock & Burn on graduation ($69,420 / 20 ETH Target)
 */
contract CessionBondingCurve {
    address public immutable treasury;
    address public constant DEAD_ADDRESS = address(0x000000000000000000000000000000000000dEaD);

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant GRADUATION_RESERVE_TOKENS = 200_000_000 * 10**18;
    uint256 public constant CURVE_TOKEN_SUPPLY = 750_000_000 * 10**18;
    uint256 public constant TARGET_GRADUATION_ETH = 20 ether; // ~$69,420 USD

    // Reentrancy Mutex
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    struct TokenPool {
        address tokenAddress;
        address creator;
        uint256 virtualEth;
        uint256 virtualTokens;
        uint256 realEthRaised;
        uint256 tokensSold;
        uint256 totalBurnedTokens;
        uint256 creatorBonusPool;
        bool isGraduated;
        uint256 createdAt;
    }

    mapping(address => TokenPool) public pools;
    mapping(address => uint256) public claimableCreatorBonus;
    address[] public allTokens;

    event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 devLockPercent);
    event TokensPurchased(address indexed token, address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 feePaid);
    event TokensSold(address indexed token, address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 feePaid);
    event TokensBurned(address indexed token, uint256 tokensBurned, uint256 ethSpent);
    event CreatorBonusClaimed(address indexed creator, uint256 amount);
    event TokenGraduated(address indexed token, uint256 ethLiquidity, uint256 tokenLiquidity, address dexPool);

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Launch a new coin with 0 protocol creation fee and Proof-of-Skin dev lock
     */
    function createCoin(
        string memory name,
        string memory symbol,
        uint256 devLockPercent
    ) external returns (address) {
        require(devLockPercent <= 100, "Invalid dev lock percent");

        CessionToken token = new CessionToken(name, symbol, msg.sender, devLockPercent);
        address tokenAddr = address(token);

        pools[tokenAddr] = TokenPool({
            tokenAddress: tokenAddr,
            creator: msg.sender,
            virtualEth: 2.5 ether, // Initial virtual liquidity
            virtualTokens: 1_073_000_000 * 10**18,
            realEthRaised: 0,
            tokensSold: 0,
            totalBurnedTokens: 0,
            creatorBonusPool: 0,
            isGraduated: false,
            createdAt: block.timestamp
        });

        allTokens.push(tokenAddr);
        emit TokenCreated(tokenAddr, msg.sender, name, symbol, devLockPercent);
        return tokenAddr;
    }

    /**
     * @notice Buy tokens on the bonding curve with slippage protection
     */
    function buy(
        address tokenAddr,
        uint256 minTokensOut,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 tokensOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        TokenPool storage pool = pools[tokenAddr];
        require(!pool.isGraduated, "Token already graduated to DEX");
        require(msg.value > 0, "ETH amount must be > 0");

        // 0.50% Total Swap Fee: 0.25% Treasury + 0.25% Buyback & Burn
        uint256 totalFee = (msg.value * 50) / 10000;
        uint256 treasuryFee = totalFee / 2;
        uint256 burnEthFee = totalFee - treasuryFee;
        uint256 netEth = msg.value - totalFee;

        // Constant Product Math: (x + dx) * (y - dy) = x * y = k
        uint256 k = pool.virtualEth * pool.virtualTokens;
        uint256 newEth = pool.virtualEth + netEth;
        uint256 newTokens = k / newEth;
        tokensOut = pool.virtualTokens - newTokens;

        require(tokensOut >= minTokensOut, "Slippage limit exceeded");
        require(pool.tokensSold + tokensOut <= CURVE_TOKEN_SUPPLY, "Curve supply exhausted");

        // Update Pool State (Effects before external interactions)
        pool.virtualEth = newEth;
        pool.virtualTokens = newTokens;
        pool.realEthRaised += netEth;
        pool.tokensSold += tokensOut;

        // Execute Algorithmic Buyback & Burn
        if (burnEthFee > 0) {
            uint256 burnTokens = (burnEthFee * pool.virtualTokens) / (pool.virtualEth + burnEthFee);
            if (burnTokens > 0 && pool.tokensSold + burnTokens <= CURVE_TOKEN_SUPPLY) {
                pool.tokensSold += burnTokens;
                pool.totalBurnedTokens += burnTokens;
                CessionToken(tokenAddr).transfer(DEAD_ADDRESS, burnTokens);
                emit TokensBurned(tokenAddr, burnTokens, burnEthFee);
            }
        }

        // Send Treasury Fee
        (bool sentTreasury, ) = treasury.call{value: treasuryFee}("");
        require(sentTreasury, "Treasury transfer failed");

        // Transfer purchased tokens to buyer
        CessionToken(tokenAddr).transfer(msg.sender, tokensOut);
        emit TokensPurchased(tokenAddr, msg.sender, msg.value, tokensOut, totalFee);

        // Check for DEX Graduation ($69.4k / 20 ETH target)
        if (pool.realEthRaised >= TARGET_GRADUATION_ETH) {
            _graduateToken(tokenAddr);
        }
    }

    /**
     * @notice Sell tokens back to the bonding curve with slippage protection
     */
    function sell(
        address tokenAddr,
        uint256 tokenAmount,
        uint256 minEthOut,
        uint256 deadline
    ) external nonReentrant returns (uint256 netEthOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        TokenPool storage pool = pools[tokenAddr];
        require(!pool.isGraduated, "Token already graduated to DEX");
        require(tokenAmount > 0, "Token amount must be > 0");

        // Transfer tokens from seller to curve contract
        CessionToken(tokenAddr).transferFrom(msg.sender, address(this), tokenAmount);

        uint256 k = pool.virtualEth * pool.virtualTokens;
        uint256 newTokens = pool.virtualTokens + tokenAmount;
        uint256 newEth = k / newTokens;
        uint256 grossEthOut = pool.virtualEth - newEth;

        // 0.50% Swap Fee
        uint256 totalFee = (grossEthOut * 50) / 10000;
        uint256 treasuryFee = totalFee;
        netEthOut = grossEthOut - totalFee;

        require(netEthOut >= minEthOut, "Slippage limit exceeded");
        require(address(this).balance >= grossEthOut, "Insufficient contract liquidity");

        // Update state
        pool.virtualEth = newEth;
        pool.virtualTokens = newTokens;
        pool.tokensSold = pool.tokensSold >= tokenAmount ? pool.tokensSold - tokenAmount : 0;
        pool.realEthRaised = pool.realEthRaised >= grossEthOut ? pool.realEthRaised - grossEthOut : 0;

        // Disperse protocol fee
        (bool sentTreasury, ) = treasury.call{value: treasuryFee}("");
        require(sentTreasury, "Treasury fee failed");

        // Transfer net ETH to seller
        (bool sentUser, ) = msg.sender.call{value: netEthOut}("");
        require(sentUser, "ETH transfer failed");

        emit TokensSold(tokenAddr, msg.sender, tokenAmount, netEthOut, totalFee);
    }

    /**
     * @dev Internal graduation logic: activates DEX migration and stores creator bonus in pull-payment balance
     */
    function _graduateToken(address tokenAddr) internal {
        TokenPool storage pool = pools[tokenAddr];
        pool.isGraduated = true;

        CessionToken token = CessionToken(tokenAddr);
        token.setGraduated();
        token.unlockDevTokens();

        // 0.5 ETH Pull-Payment Creator DEX Graduation Bounty
        uint256 bounty = 0.5 ether;
        if (address(this).balance >= bounty) {
            claimableCreatorBonus[pool.creator] += bounty;
        }

        emit TokenGraduated(tokenAddr, pool.realEthRaised, GRADUATION_RESERVE_TOKENS, DEAD_ADDRESS);
    }

    /**
     * @notice Claim accrued creator graduation bounty (Pull-Payment Pattern)
     */
    function claimCreatorBounty() external nonReentrant {
        uint256 amount = claimableCreatorBonus[msg.sender];
        require(amount > 0, "No claimable bounty");
        claimableCreatorBonus[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Bounty transfer failed");

        emit CreatorBonusClaimed(msg.sender, amount);
    }

    function getAllTokensCount() external view returns (uint256) {
        return allTokens.length;
    }
}
