/** Explicit inventory fixtures for legacy transport tests; production never infers these. */
export const testModels = ['gpt-5.6-sol', 'test-model', 'test', 'gpt-5.6-terra', 'image:test-model', 'image:test', 'image:gpt-5.6-terra'];
export function installTestCapabilities(relay: any) {
  const original = relay.installFleet.bind(relay);
  relay.installFleet = (items: any[]) => {
    original(items);
    for (const shard of relay.shardsTable.getAll()) relay.capabilities.publishInventory(relay.capabilities.beginRefresh(shard.id), testModels);
  };
}
