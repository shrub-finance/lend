import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

struct BorrowData {
    uint40 startDate;
    uint40 endDate;
    uint256 debt;
    uint256 collateral;
    uint32 apy;
}

interface IBorrowPositionToken {
    function mint(address account, BorrowData calldata borrowData) external returns (uint);
}

contract BorrowPositionToken is ERC721, Ownable {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    uint public currentIndex = 0;

    mapping(uint256 => BorrowData) borrowDatas;

    function mint(address account, BorrowData calldata borrowData) external onlyOwner returns (uint){
        currentIndex++;
//        borrowData.startDate = something from the transaction
        borrowDatas[currentIndex] = borrowData;
        _mint(account, currentIndex);
        return currentIndex;
    }

    function getCurrentIndex() public view returns(uint) {
        return currentIndex;
    }
}
