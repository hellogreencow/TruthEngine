// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TruthVerification
 * @dev A smart contract to store and verify fact-checking results on the blockchain
 */
contract TruthVerification {
    // Structure to store verification data
    struct VerificationRecord {
        string contentHash;      // Hash of the original content
        string resultsHash;      // Hash of the verification results (stored in IPFS)
        uint256 timestamp;       // When the verification was performed
        uint8 trustScore;        // Overall trust score (0-100)
        uint256 claimCount;      // Number of claims verified
        address verifier;        // Address that performed the verification
    }
    
    // Mapping from content hash to verification record
    mapping(string => VerificationRecord) public verifications;
    
    // Array to store all content hashes for enumeration
    string[] public contentHashes;
    
    // Event emitted when a new verification is stored
    event VerificationStored(
        string contentHash,
        string resultsHash,
        uint256 timestamp,
        uint8 trustScore,
        address verifier
    );

    /**
     * @dev Store a new verification record
     * @param _contentHash Hash of the original content
     * @param _resultsHash Hash of the verification results (stored in IPFS)
     * @param _trustScore Overall trust score (0-100)
     * @param _claimCount Number of claims verified
     */
    function storeVerification(
        string memory _contentHash,
        string memory _resultsHash,
        uint8 _trustScore,
        uint256 _claimCount
    ) public {
        // Create a new verification record
        VerificationRecord memory newRecord = VerificationRecord({
            contentHash: _contentHash,
            resultsHash: _resultsHash,
            timestamp: block.timestamp,
            trustScore: _trustScore,
            claimCount: _claimCount,
            verifier: msg.sender
        });
        
        // Store the verification record
        verifications[_contentHash] = newRecord;
        
        // Add to the list of content hashes if not already present
        bool exists = false;
        for (uint i = 0; i < contentHashes.length; i++) {
            if (keccak256(bytes(contentHashes[i])) == keccak256(bytes(_contentHash))) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            contentHashes.push(_contentHash);
        }
        
        // Emit the event
        emit VerificationStored(
            _contentHash,
            _resultsHash,
            block.timestamp,
            _trustScore,
            msg.sender
        );
    }
    
    /**
     * @dev Get verification record for a specific content hash
     * @param _contentHash Hash of the content to look up
     * @return The verification record
     */
    function getVerification(string memory _contentHash) public view returns (
        string memory contentHash,
        string memory resultsHash,
        uint256 timestamp,
        uint8 trustScore,
        uint256 claimCount,
        address verifier
    ) {
        VerificationRecord storage record = verifications[_contentHash];
        return (
            record.contentHash,
            record.resultsHash,
            record.timestamp,
            record.trustScore,
            record.claimCount,
            record.verifier
        );
    }
    
    /**
     * @dev Check if a verification exists for a specific content hash
     * @param _contentHash Hash of the content to check
     * @return true if verification exists, false otherwise
     */
    function verificationExists(string memory _contentHash) public view returns (bool) {
        // Check if the content hash exists in the verifications mapping
        return bytes(verifications[_contentHash].contentHash).length > 0;
    }
    
    /**
     * @dev Get the total number of verifications stored
     * @return The number of verifications
     */
    function getVerificationCount() public view returns (uint256) {
        return contentHashes.length;
    }
    
    /**
     * @dev Get all verification records (for pagination)
     * @param _start Starting index
     * @param _limit Maximum number of records to return
     * @return Array of verification records
     */
    function getVerifications(uint256 _start, uint256 _limit) public view returns (
        string[] memory contentHashList,
        string[] memory resultsHashList,
        uint256[] memory timestampList,
        uint8[] memory trustScoreList,
        uint256[] memory claimCountList
    ) {
        // Calculate the actual number of records to return
        uint256 end = _start + _limit;
        if (end > contentHashes.length) {
            end = contentHashes.length;
        }
        uint256 resultCount = end - _start;
        
        // Initialize the return arrays
        contentHashList = new string[](resultCount);
        resultsHashList = new string[](resultCount);
        timestampList = new uint256[](resultCount);
        trustScoreList = new uint8[](resultCount);
        claimCountList = new uint256[](resultCount);
        
        // Fill the return arrays
        for (uint256 i = 0; i < resultCount; i++) {
            VerificationRecord storage record = verifications[contentHashes[_start + i]];
            contentHashList[i] = record.contentHash;
            resultsHashList[i] = record.resultsHash;
            timestampList[i] = record.timestamp;
            trustScoreList[i] = record.trustScore;
            claimCountList[i] = record.claimCount;
        }
        
        return (contentHashList, resultsHashList, timestampList, trustScoreList, claimCountList);
    }
}