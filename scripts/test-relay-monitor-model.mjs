import test from 'node:test';
import assert from 'node:assert/strict';
import { accountHealth, registrationHealth, filterRegistrations, accountApplied, filterAccounts, needsSignIn, registrationStep, relayFresh, executionStatus } from '../src/relay/pool-monitor-model.js';

test('automatic activation explains readiness without overriding intentional pauses', () => {
 const now=Date.now(), a={state:'enabled',credentialExpiresAt:now+60000};
 const s={automaticActivation:true,executionAllowed:false,accounts:[],relayFresh:true};
 assert.equal(executionStatus(s,now).label,'Waiting for account');
 s.accounts=[a];assert.equal(executionStatus(s,now).label,'Activating');
 assert.equal(executionStatus({...s,relayFresh:false},now).label,'Waiting for relay');
 assert.equal(executionStatus({...s,accounts:[{...a,state:'paused'}]},now).label,'Accounts paused');
 assert.equal(executionStatus({...s,accounts:[{...a,connectionState:'sign_in_required'}]},now).label,'Reconnect required');
 assert.equal(executionStatus({...s,accounts:[{...a,state:'revoked'}]},now).label,'Waiting for account');
 assert.equal(executionStatus({...s,automaticActivation:false},now).label,'Paused');
 assert.equal(executionStatus({...s,executionAllowed:true},now).label,'Allowed');
});

test('confirmation needs a fresh non-future heartbeat and matching revision and epoch', () => {
  const now = Date.now(), state = { relayFresh: true };
  const account = { revision: 3, applied: true };
  assert.equal(accountApplied(account, state, now), true);
  for (const relayFreshState of [undefined, false]) {
    assert.equal(relayFresh({ ...state, relayFresh: relayFreshState }, now), false);
    assert.equal(accountApplied(account, { ...state, relayFresh: relayFreshState }, now), false);
  }
  assert.equal(accountApplied({ ...account, applied: false }, state, now), false);
});

test('account filters combine name and state, keeping revoked accounts out of sign-in attention', () => {
  const now = Date.now(), accounts = [
    { name: 'Design Studio', state: 'paused', credentialExpiresAt: now - 1 },
    { name: 'Design Archive', state: 'revoked', credentialExpiresAt: now - 1 },
    { name: 'Research', state: 'enabled', credentialExpiresAt: now + 1 }
  ];
  assert.deepEqual(filterAccounts(accounts, ' DESIGN ', 'attention', now), [accounts[0]]);
  assert.deepEqual(filterAccounts(accounts, 'design', 'revoked', now), [accounts[1]]);
  assert.deepEqual(filterAccounts(accounts, 'missing', 'all', now), []);
  assert.equal(needsSignIn({ credentialExpiresAt: 'invalid' }, now), true);
  assert.equal(needsSignIn({ credentialExpiresAt: now }, now), true);
});

test('desktop login completion does not imply reviewed or registered central access', () => {
  assert.equal(registrationStep({ state: 'prepared' }, { login: { state: 'waiting' } }), 1);
  assert.equal(registrationStep({ state: 'prepared' }, { login: { state: 'saved' } }), 2);
  assert.equal(registrationStep({ state: 'reviewed' }, { login: { state: 'saved' } }), 2);
  assert.equal(registrationStep({ state: 'registered' }, undefined), 3);
});


test('health separates a failed refresh from reported problems and normal paused state', () => {
  const now=Date.now(), state={relayFresh:true,executionAllowed:true};
  const account={id:'one',name:'Studio',state:'paused',revision:1,applied:true,credentialExpiresAt:now+10000};
  assert.equal(accountHealth(account,state,true,now).code,'ok');
  assert.equal(accountHealth({...account,credentialExpiresAt:0},state,false,now).code,'unknown');
  assert.equal(accountHealth({...account,credentialExpiresAt:0},state,true,now).code,'signin');
  assert.equal(accountHealth({...account,cooldownUntilMs:now+1000},state,true,now).code,'cooldown');
  assert.equal(accountHealth({...account,consecutiveFailures:3},state,true,now).code,'failures');
  assert.equal(accountHealth(account,{...state,relayFresh:false},true,now).code,'unknown');
  assert.equal(accountHealth({...account,revision:2,applied:false,updatedAt:new Date(now-90000).toISOString()},state,true,now).attention,true);
  assert.equal(accountHealth({...account,revision:2,applied:false,updatedAt:new Date(now+1).toISOString()},state,true,now).attention,false);
});

test('removed resources are isolated from active filters and unfinished registration cleanup stays visible', () => {
  const now=Date.now(), state={relayFresh:true,accounts:[],desktopAvailable:true,desktops:[{id:'desk',state:'running',canConnect:true}]};
  const removed={id:'r',desktopId:'desk',name:'Removed draft',state:'prepared',removedAt:new Date(now).toISOString()};
  assert.equal(registrationHealth(removed,state,true,now).code,'cleanup');
  assert.equal(filterRegistrations([removed],'','all',state).length,0);
  assert.equal(filterRegistrations([removed],'removed','removed',state).length,1);
  const account={name:'Removed account',state:'revoked',removedAt:new Date(now).toISOString()};
  assert.equal(filterAccounts([account],'','all',now).length,0);
  assert.equal(filterAccounts([account],'','removed',now).length,1);
  assert.equal(accountHealth(account,state,false,now).code,'removed');
});

test('a stopped desktop is normal for a registered account with current access', () => {
  const now=Date.now(),account={id:'a',state:'paused',credentialExpiresAt:now+10000};
  const state={accounts:[account],executionAllowed:false,relayFresh:true,desktopAvailable:true,desktops:[{id:'desk',state:'stopped',canConnect:false}]};
  assert.equal(registrationHealth({accountId:'a',desktopId:'desk',state:'registered'},state,true,now).code,'ok');
  assert.equal(registrationHealth({desktopId:'desk',state:'prepared'},state,true,now).code,'desktop');
  assert.equal(filterRegistrations([{name:'Draft',desktopId:'desk',state:'prepared'}],'draft','attention',state,true,now).length,1);
});

test('rejected credentials require reconnect even before expiry and keep the saved account state', () => {
  const now=Date.now(),account={name:'Studio',state:'enabled',connectionState:'sign_in_required',credentialExpiresAt:now+3600000};
  assert.equal(needsSignIn(account,now),true);
  assert.equal(accountHealth(account,{relayFresh:true},true,now).code,'signin');
  assert.deepEqual(filterAccounts([account],'','attention',now),[account]);
  assert.equal(account.state,'enabled');
});
