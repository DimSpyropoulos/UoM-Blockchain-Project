// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

contract LotteryBallot {
    struct Item {
        uint256 id;
        string name;
        address[] itemTokens;
    }
    
    address payable public owner;
    uint256 public contractBalance;
    bool public drawHappened;
    
    Item[3] public items;
    uint256[] public winnerIds;
    mapping(address => mapping(uint256 => uint256)) public winners;
    mapping(uint256 => address) public winnerAddresses;

    event TokenBought(address indexed buyer, string itemName);
    event WinnerDeclared(address winner, uint256 itemId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
        items[0] = Item(0, "Item0", new address[](0));
        items[1] = Item(1, "Item1", new address[](0));
        items[2] = Item(2, "Item2", new address[](0));
    }

    function bid(uint256 itemIndex) external payable {
        require(msg.value >= 0.01 ether, "Min 0.01 ETH");
        require(msg.sender != owner, "Owner cannot bid");
        require(!drawHappened, "Drawing completed");
        require(itemIndex < 3, "Invalid item");

        items[itemIndex].itemTokens.push(msg.sender);
        contractBalance += msg.value;
        emit TokenBought(msg.sender, items[itemIndex].name);
    }

    function declareWinner() external onlyOwner {
        require(!drawHappened, "Already drawn");
        
        for (uint256 i = 0; i < 3; i++) {
            if (items[i].itemTokens.length > 0) {
                uint256 random = uint256(
                    keccak256(
                        abi.encodePacked(
                            block.prevrandao,
                            block.timestamp,
                            block.number
                        )
                    )
                ) % items[i].itemTokens.length;
                
                address winner = items[i].itemTokens[random];
                winnerIds.push(i);
                winners[winner][i]++;
                winnerAddresses[i] = winner;
                emit WinnerDeclared(winner, i);
            }
        }
        drawHappened = true;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        contractBalance = 0;
        owner.transfer(balance);
    }

    function reset() external onlyOwner {
        for (uint256 i = 0; i < 3; i++) {
            delete items[i].itemTokens;
        }
        delete winnerIds;
        drawHappened = false;
    }

    function getItems() external view returns (Item[3] memory) {
        return items;
    }

    function getFlag() external view returns (bool) {
        return drawHappened;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = payable(newOwner);
    }

    function selfDestruct() external onlyOwner {
        selfdestruct(owner);
    }

    function winner(uint256 index) external view returns (address) {
        require(index < winnerIds.length, "Invalid index");
        return winnerAddresses[winnerIds[index]];
    }

    function getWinners(address addr, uint256 itemId) external view returns (uint256) {
        return winners[addr][itemId];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
