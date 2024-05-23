const core = require('@actions/core');
async function getIDTokenAction() {
   const token = await core.getIDToken();
   core.setOutput("token", token);
}
await getIDTokenAction();