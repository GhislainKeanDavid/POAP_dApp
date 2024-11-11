// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract POAP is ERC721, Ownable {
    uint256 public tokenCounter;
    mapping(uint256 => string) private tokenURIs;
    mapping(uint256 => bool) private _mintedTokens;

    constructor(address initialOwner) ERC721("ProofOfAttendance", "POAP") Ownable(initialOwner) {
        tokenCounter = 0;
    }

    // Internal function to set token URI
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        tokenURIs[tokenId] = _tokenURI;
    }

    // Function to mint POAP to an attendee
    function mintPOAP(address attendee, string memory metadataURI) public onlyOwner {
        uint256 newTokenId = tokenCounter;
        _safeMint(attendee, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        _mintedTokens[newTokenId] = true; // Mark the token as minted
        tokenCounter++;
    }

    // Override tokenURI function to return stored token URI
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_mintedTokens[tokenId], "ERC721Metadata: URI query for nonexistent token");
        return tokenURIs[tokenId];
    }
}