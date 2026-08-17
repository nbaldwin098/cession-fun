// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CalabiToken
 * @dev Standard ERC-20 token minted exclusively through CalabiBondingCurve.
 * Fixed supply of 1,000,000,000 tokens. 0% transfer tax.
 * Enforces Proof-of-Skin dev token lock until DEX graduation.
 */
contract CalabiToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public constant totalSupply = 1_000_000_000 * 10**18; // 1 Billion

    address public immutable factory;
    address public immutable creator;
    uint256 public immutable devTokensLocked;
    bool public isGraduated;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event DevTokensUnlocked(address indexed dev, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        address _creator,
        uint256 _devLockPercent
    ) {
        require(_creator != address(0), "ERC20: invalid creator");
        name = _name;
        symbol = _symbol;
        creator = _creator;
        factory = msg.sender;

        // 5% max allocation for dev (50,000,000 tokens)
        uint256 devAllocation = 50_000_000 * 10**18;
        devTokensLocked = (devAllocation * _devLockPercent) / 100;
        uint256 devImmediate = devAllocation - devTokensLocked;

        if (devImmediate > 0) {
            balanceOf[_creator] = devImmediate;
            emit Transfer(address(0), _creator, devImmediate);
        }

        if (devTokensLocked > 0) {
            balanceOf[address(this)] = devTokensLocked;
            emit Transfer(address(0), address(this), devTokensLocked);
        }

        // Remaining 950,000,000 tokens minted to bonding curve factory
        uint256 curveSupply = totalSupply - devAllocation;
        balanceOf[msg.sender] = curveSupply;
        emit Transfer(address(0), msg.sender, curveSupply);
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(recipient != address(0), "ERC20: transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "ERC20: approve to zero address");
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(sender != address(0), "ERC20: transfer from zero address");
        require(recipient != address(0), "ERC20: transfer to zero address");
        require(balanceOf[sender] >= amount, "ERC20: insufficient balance");
        
        uint256 currentAllowance = allowance[sender][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            allowance[sender][msg.sender] = currentAllowance - amount;
        }

        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }

    /**
     * @notice Unlocks dev tokens upon DEX graduation
     */
    function unlockDevTokens() external {
        require(msg.sender == factory, "Only factory can trigger unlock");
        require(isGraduated, "Token not graduated yet");
        if (devTokensLocked > 0 && balanceOf[address(this)] >= devTokensLocked) {
            balanceOf[address(this)] -= devTokensLocked;
            balanceOf[creator] += devTokensLocked;
            emit Transfer(address(this), creator, devTokensLocked);
            emit DevTokensUnlocked(creator, devTokensLocked);
        }
    }

    function setGraduated() external {
        require(msg.sender == factory, "Only factory");
        isGraduated = true;
    }
}
