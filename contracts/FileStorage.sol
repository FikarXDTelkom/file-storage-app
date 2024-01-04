// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract FileStorage {
    struct File {
        string ipfsHash;
        string fileName;
        address owner;
    }

    mapping(uint256 => File) public files;
    uint256 public fileCount;

    function addFile(string memory _ipfsHash, string memory _fileName) public {
        fileCount++;
        files[fileCount] = File(_ipfsHash, _fileName, msg.sender);
    }
}
