// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Pool is Initializable {
    string public constant name = "ETHPool";
    bool private initialized;
    bool private stopped;
    address private owner;
    uint256 private rewardTime;
    uint256 private rewardAmount;
    uint256 private totalDeposited;
    DepositData[] private depositData;
    mapping(address => uint256) public balanceOf;

    struct DepositData {
        address user;
        uint256 amount;
        uint256 time;
        bool getReward;
    }

    event Deposit(address indexed user, uint256 amount, uint256 time);
    event Reward(uint256 amount, uint256 time);
    event Withdraw(address indexed user, uint256 amount, uint256 profits);

    /// @dev initialize contract
    function initialize() public initializer {
        require(!initialized, "already initialized");

        initialized = true;
        stopped = false;
        owner = msg.sender;
    }

    modifier isNotStopped() {
        require(stopped == false, "stopped contract");
        _;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "not owner");
        _;
    }

    modifier onlyUser() {
        require(owner != msg.sender, "not user");
        _;
    }

    /// @dev deposit eth to the pool
    function deposit() external payable isNotStopped onlyUser {
        // deposit amount should be greater than zero
        require(msg.value > 0, "can't be 0");

        // add the deposit amount to the total and record the deposit amount
        totalDeposited += msg.value;
        depositData.push(DepositData({
            user: msg.sender,
            amount: msg.value,
            time: block.timestamp,
            getReward: false
        }));

        // trigger deposit event
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }

    /// @dev deposits reward eth to the pool
    function reward() external payable onlyOwner {
        // reward amount should be greater than zero
        require(msg.value > 0, "can't be 0");

        // update rewards data
        rewardTime = block.timestamp;
        rewardAmount = msg.value;

        // trigger reward event
        emit Reward(msg.value, block.timestamp);
    }

    /// @dev withdraws balance from the pool
    function withdraw() external isNotStopped onlyUser {
        uint256 depositLength = depositData.length;
        uint256 depositAmount;
        uint256 totalAmount;
        DepositData memory bufData;

        for (uint256 i = 0; i < depositLength; i++) {
            bufData = depositData[i];

            // skip if current user is not msg.sender or user has already been rewarded
            if (bufData.user != msg.sender || bufData.getReward) continue;
            // break the loop if deposit time is greater than reward time
            if (bufData.time > rewardTime) break;

            // add amount to total amount and set rewarded flag
            depositAmount += bufData.amount;
            depositData[i].getReward = true;
        }

        // deposit amount should be greater than zero
        require(depositAmount > 0, "nothing deposited");

        // calculate user's profit
        totalAmount = depositAmount + (rewardAmount * depositAmount) / totalDeposited;

        // transfer eth to the user
        payable(msg.sender).transfer(totalAmount);

        // trigger withdraw event
        emit Withdraw(msg.sender, depositAmount, totalAmount);
    }

    /// @dev return all deposit history
    function depositHistory() external view isNotStopped returns(DepositData[] memory) {
        return depositData;
    }

    /// @dev return contract version
    function version() external virtual pure returns(string memory) {
        return "1.0.0";
    }

    /// @dev toggle stopped status
    function toggleStopped() external onlyOwner {
        stopped = !stopped;
    }

    /// @dev get reward data
    function getRewardData() external view isNotStopped returns(uint256 time, uint256 amount) {
        return (rewardTime, rewardAmount);
    }
}