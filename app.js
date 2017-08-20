const _ = require('lodash');
const moment = require('moment');

//Read all 3 files
const fs = require('fs');
let accounts = fs.readFileSync('./data/accounts.json','UTF8');
let amazecom = fs.readFileSync('./data/amazecom.json','UTF8');
let wondertel = fs.readFileSync('./data/wondertel.json','UTF8');

//Clean up the partners records
amazecom = cleanUp(amazecom);
wondertel = cleanUp(wondertel);

const users = JSON.parse(accounts).users;
let subs = `{"subscriptions": {`;
let list = '';

for(let i = 0; i < users.length; i++){
    let temp = analyseUser(users[i].name, users[i].number, amazecom, wondertel);
    if(temp != ''){
        if(list != ''){
            list+=',';
        }
        list += temp;
    }
}
subs += list + "}}";
subs = JSON.stringify(JSON.parse(subs), undefined, 2);

let output = fs.writeFileSync('./output/result.json', subs, 'UTF-8');
console.log('DONE!!!!');


//Function to clean up grants without period
function cleanUp(partnersStr) {
    let partners = JSON.parse(partnersStr);
    let grants = _.pick(partners, 'grants');
    
    grants = grants.grants.filter( (grant) => grant.period);
    return _.assign(_.pick(partners, 'revocations'), {"grants":grants});
}

function generateUserDetails(userDetails, name, phoneNumber, type, partner, partnerList){
    if(type === 'G'){
        for(let record of partnerList.grants){
            if(record.number === phoneNumber){
                userDetails.push({
                    name,
                    phoneNumber,
                    period: record.period,
                    partner,
                    type,
                    date: record.date
                });
            }
        }
    }else {
        for(let record of partnerList.revocations){
            if(record.number === phoneNumber){
                userDetails.push({
                    name,
                    phoneNumber,
                    partner,
                    type,
                    date: record.date
                });
            }
        }
    }
    
    return userDetails;
}

function getOwner(userDetails){
    userDetails.sort((a, b) => {
        return moment(a.date).diff(moment(b.date));
    })
    return userDetails[0].partner;
}

function analyseUser(name, phoneNumber, amazecom, wondertel){
    let userDetails = [];
    generateUserDetails(userDetails, name, phoneNumber, 'G', 'Amazecom', amazecom);
    generateUserDetails(userDetails, name, phoneNumber, 'G', 'Wondertel', wondertel);
    generateUserDetails(userDetails, name, phoneNumber, 'R', 'Amazecom', amazecom);
    generateUserDetails(userDetails, name, phoneNumber, 'R', 'Wondertel', wondertel);
    
    //Now calculate their days
    //First day of grant
    //is there any revocation, check and see if the revokation date is within period

    userDetails.sort((a, b) => {
        return moment(a.date).diff(moment(b.date));
    });
    
    grantedDays = {
        owner: '',
        notOwner: '',
        ownerCount: 0,
        others: 0
    }
    var startDate, endDate, type, owner, whoseDate = '';
    
    userDetails.map( (record, index) => {
        if(!type && !owner){
            if(record.type === 'G'){
                type = 'G';
                owner = record.partner;
                grantedDays.owner = owner;
            }
        }

        if(record.type === 'G'){
            //WE HAVE GRANT TYPE
            
            //First time we get grant
            if(!startDate && !endDate){
                startDate = moment(record.date);
                endDate = moment(record.date).add(record.period, 'months');
                whoseDate = record.partner;
            }else{
                //Not the first Grant
                //Is it from the same owner?
                if(owner === record.partner){
                    //OWNER
                    //If within start and end date then add it to the end
                    if(moment(record.date).isBetween(startDate, endDate)){
                        if(whoseDate === record.partner){
                            endDate = endDate.add(record.period, 'months');
                        }
                    }else{
                        //It is not within the active period so calculate previous days
                        if(whoseDate === record.partner){
                            grantedDays.ownerCount += moment(endDate).diff(startDate, 'days');
                            startDate = record.date;
                            endDate = moment(startDate).add(record.period, 'months');
                        }else {
                            //It is out of the range
                            //It is not from the owner
                            //It is a new offer from another partner
                        }
                        
                    }
                }else{
                    //NOT THE OWNER
                    //Check if it is not between start and end
                    if(moment(record.date).isBetween(startDate, endDate)){
                        if(whoseDate === record.partner){
                            grantedDays.others += moment(endDate).diff(startDate, 'days');
                            grantedDays.notOwner = record.partner;
                            startDate = record.date;
                            endDate = moment(startDate).add(record.period, 'months');
                        }else {
                            //It is out of the range
                            //It is not from the owner
                            //It is a new offer from another partner
                            
                        }
                    }else{
                        grantedDays.others = moment(record.date).add(record.period, 'months').diff(moment(record.date), 'days');
                        grantedDays.notOwner = record.partner;
                    }
                }
            }
            
        }else{
            //WE HAVE REVOKE TYPE
            //Check if the owner is revoking
            if(owner === record.partner){
                //Owner is revoking
                //Check the revoke if it is in between
                if(moment(record.date).isBetween(startDate, endDate)){
                    //Then just calculate the days and clean up
                    grantedDays.ownerCount += moment(record.date).diff(startDate, 'days');
                    startDate = '';
                    endDate = '';
                }else {
                    //It is not in the granted period
                    //Nothing to do then as already been expired
                }
            }else{
                //It is not the owner so we ignore it
            }

        }
    })
    
    if(startDate && endDate){
        if(whoseDate === owner){
            grantedDays.ownerCount += endDate.diff(startDate, 'days');
        }else{
            grantedDays.others += endDate.diff(startDate, 'days');
        }
    }
    
    let temp = '';
    if(userDetails[0]){
        if(grantedDays.others > 0){
            temp += `"${userDetails[0].name}":{ "${grantedDays.owner}": ${grantedDays.ownerCount}, "${grantedDays.notOwner}":${grantedDays.others}}`;
        }else{
            temp += `"${userDetails[0].name}":{ "${grantedDays.owner}": ${grantedDays.ownerCount}}`;
        }        
    }
    return temp;
}

module.exports = {
    cleanUp, 
    generateUserDetails,
    getOwner
}