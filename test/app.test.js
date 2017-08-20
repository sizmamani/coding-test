const fs = require('fs');
const { cleanUp, generateUserDetails, getOwner } = require('../app.js');
const expect = require('expect');

describe('APP', () => {
    it('should check the cleanup method', () => {
        let amazecom = fs.readFileSync('./data/amazecom.json','UTF8');
        
        var res = cleanUp(amazecom);
        expect(res.revocations).toExist();
        expect(res.grants).toExist();
        expect(res.grants.length).toBeA('number').toBe(14);
    });

    it('should check all the grants given to the user', () => {
        let amazecom = fs.readFileSync('./data/amazecom.json','UTF8');
        let wondertel = fs.readFileSync('./data/wondertel.json','UTF8');
        amazecom = cleanUp(amazecom);
        wondertel = cleanUp(wondertel);
        var userDetails = [];
        generateUserDetails(userDetails, 'John', '77902601451', 'G', 'Amazecom', amazecom);
        generateUserDetails(userDetails, 'John', '77902601451', 'G', 'Wondertel', wondertel);
        expect(userDetails).toBeA('object');
        expect(userDetails.length).toBeGreaterThan(0);
        expect(userDetails[0]).toIncludeKeys(['name', 'partner', 'phoneNumber', 'type', 'date']);
        expect(userDetails[userDetails.length - 1]).toExclude({type:'R'});
    });

    it('should find the user owner', () => {
        let amazecom = fs.readFileSync('./data/amazecom.json','UTF8');
        let wondertel = fs.readFileSync('./data/wondertel.json','UTF8');
        amazecom = cleanUp(amazecom);
        wondertel = cleanUp(wondertel);
        var userDetails = [];
        generateUserDetails(userDetails, 'John', '77902601451', 'G', 'Amazecom', amazecom);
        generateUserDetails(userDetails, 'John', '77902601451', 'G', 'Wondertel', wondertel);
        generateUserDetails(userDetails, 'John', '77902601451', 'R', 'Amazecom', amazecom);
        generateUserDetails(userDetails, 'John', '77902601451', 'R', 'Wondertel', wondertel);
        var owner = getOwner(userDetails);
        expect(owner).toExist();
        expect(owner).toBeA('string');
        expect(owner).toBe('Amazecom');
    });
});