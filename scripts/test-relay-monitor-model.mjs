import test from 'node:test';
import assert from 'node:assert/strict';
import { accountHealth, registrationHealth, filterRegistrations, accountApplied, filterAccounts, needsSignIn, registrationStep, relayFresh } from '../src/relay/pool-monitor-model.js';

test('confirmation needs a fresh non-future heartbeat and matching revision and epoch', () => {
  const now = Date.now(), state = { lastSeenAt: new Date(now - 1000).toISOString(), epoch: 'current' };
  const account = { revision: 3, acknowledgedRevision: 3, acknowledgedEpoch: 'current' };
  assert.equal(accountApplied(account, state, now), true);
  for (const lastSeenAt of [undefined, 'invalid', new Date(now + 1).toISOString(), new Date(now - 45000).toISOString()]) {
    assert.equal(relayFresh({ ...state, lastSeenAt }, now), false);
    assert.equal(accountApplied(account, { ...state, lastSeenAt }, now), false);
  }
  assert.equal(accountApplied({ ...account, acknowledgedRevision: 2 }, state, now), false);
  assert.equal(accountApplied({ ...account, acknowledgedEpoch: 'previous' }, state, now), false);
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
  assert.equal(registrationStep({ state: 'reviewed' }, { login: { state: 'saved' } }), 3);
  assert.equal(registrationStep({ state: 'registered' }, undefined), 4);
});


test('health separates a failed refresh from reported problems and normal paused state', () => {
  const now=Date.now(), state={lastSeenAt:new Date(now).toISOString(),epoch:'one',executionAllowed:true};
  const account={id:'one',name:'Studio',state:'paused',revision:1,acknowledgedRevision:1,acknowledgedEpoch:'one',credentialExpiresAt:now+10000};
  assert.equal(accountHealth(account,state,true,now).code,'ok');
  assert.equal(accountHealth({...account,credentialExpiresAt:0},state,false,now).code,'unknown');
  assert.equal(accountHealth({...account,credentialExpiresAt:0},state,true,now).code,'signin');
  assert.equal(accountHealth({...account,cooldownUntilMs:now+1000},state,true,now).code,'cooldown');
  assert.equal(accountHealth({...account,consecutiveFailures:3},state,true,now).code,'failures');
  assert.equal(accountHealth(account,{...state,lastSeenAt:'invalid'},true,now).code,'unknown');
  assert.equal(accountHealth({...account,revision:2,updatedAt:new Date(now-90000).toISOString()},state,true,now).attention,true);
  assert.equal(accountHealth({...account,revision:2,updatedAt:new Date(now+1).toISOString()},state,true,now).attention,false);
});

test('removed resources are isolated from active filters and unfinished registration cleanup stays visible', () => {
  const now=Date.now(), state={lastSeenAt:new Date(now).toISOString(),accounts:[],desktopAvailable:true,desktops:[{id:'desk',state:'running',canConnect:true}]};
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
  const state={accounts:[account],executionAllowed:false,lastSeenAt:new Date(now).toISOString(),desktopAvailable:true,desktops:[{id:'desk',state:'stopped',canConnect:false}]};
  assert.equal(registrationHealth({accountId:'a',desktopId:'desk',state:'registered'},state,true,now).code,'ok');
  assert.equal(registrationHealth({desktopId:'desk',state:'prepared'},state,true,now).code,'desktop');
  assert.equal(filterRegistrations([{name:'Draft',desktopId:'desk',state:'prepared'}],'draft','attention',state,true,now).length,1);
});
