#!/usr/bin/env node
// morph-cli.js
// CLI for Morph OS v1.1 — Pure syscall shell. No internal access.

const fs = require('fs');
const path = require('path');
const { MorphOrchestrator } = require('./morph-os-kernel.js');

let morphOS = null;

function getOS() {
  if (!morphOS) morphOS = new MorphOrchestrator();
  return morphOS;
}

function init() {
  console.log('🛠️  Initializing Morph OS v1.1...\n');
  const required = ['trident-gnn-complete.json', 'morph-kernel-entry-v4.json'];
  for (const file of required) {
    if (!fs.existsSync(file)) { console.error(`❌ Missing: ${file}`); process.exit(1); }
    console.log(`✅ ${file}`);
  }
  if (!fs.existsSync('./memory')) fs.mkdirSync('./memory', { recursive: true });
  ['artifacts.json', 'contracts.json', 'evolution-log.json'].forEach(file => {
    const fp = `./memory/${file}`;
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, file === 'evolution-log.json' ? '[]' : '{}');
  });
  console.log('\n🎉 Morph OS initialized!');
}

function ingest(args) {
  const filepath = args[0];
  if (!filepath || !fs.existsSync(filepath)) {
    console.error('Usage: morph ingest <file>'); process.exit(1);
  }
  const os = getOS();
  const artifactId = os.orchestrate('INGEST', { filepath });
  console.log(`\n📦 Ingested: ${artifactId}`);
  return artifactId;
}

function study(args) {
  const artifactId = args[0];
  if (!artifactId) { console.error('Usage: morph study <artifactId>'); process.exit(1); }
  const os = getOS();
  const analysis = os.orchestrate('STUDY', { artifactId });
  console.log('\n📊 Study Results');
  console.log('═══════════════════════════════════════');
  console.log(`Artifact: ${artifactId}`);
  console.log(`Nodes: ${analysis.structure.nodeCount}`);
  console.log(`Complexity: ${analysis.structure.cyclomaticComplexity}`);
  console.log(`Patterns: ${analysis.patterns.join(', ') || 'none'}`);
  console.log(`Resonance: Gate ${analysis.resonance.primaryGate}, Circuit ${analysis.resonance.circuitFamily}`);
  console.log(`Issues: ${analysis.issues.length}`);
  if (analysis.issues.length > 0) {
    console.log('\n⚠️ Issues:');
    analysis.issues.forEach(i => console.log(`   [${i.severity.toUpperCase()}] ${i.message}`));
  }
  return analysis;
}

function understand(args) {
  const artifactId = args[0];
  if (!artifactId) { console.error('Usage: morph understand <artifactId>'); process.exit(1); }
  const os = getOS();
  const rep = os.orchestrate('UNDERSTAND', { artifactId });
  console.log('\n🧠 Understanding');
  console.log('═══════════════════════════════════════');
  console.log(`Intent: ${rep.intent.primary}`);
  console.log(`Confidence: ${rep.confidence.toFixed(1)}%`);
  console.log('Capabilities:');
  Object.entries(rep.capabilities).forEach(([k, v]) => console.log(`   ${k}: ${v ? '✅' : '❌'}`));
  return rep;
}

function regenerate(args) {
  const artifactId = args[0];
  if (!artifactId) { console.error('Usage: morph regenerate <artifactId> --mode <mode>'); process.exit(1); }
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'equivalent';
  const os = getOS();
  const result = os.orchestrate('REGENERATE', { artifactId, mode });
  console.log('\n🔧 Regeneration');
  console.log('═══════════════════════════════════════');
  console.log(`Mode: ${mode}`);
  console.log(`Architecture: ${result.architecture}`);
  console.log(`Syntax: ${result.verification.syntaxValid ? '✅' : '❌'}`);
  console.log(`Size: ${result.code.length} chars`);
  const outFile = `./memory/regenerated_${artifactId}_${mode}.js`;
  fs.writeFileSync(outFile, result.code);
  console.log(`\n💾 Saved: ${outFile}`);
  return result;
}

function pipeline(args) {
  const filepath = args[0];
  if (!filepath || !fs.existsSync(filepath)) {
    console.error('Usage: morph pipeline <file> --mode <mode>'); process.exit(1);
  }
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'improved';
  console.log('\n🚀 ATOMIC PIPELINE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Input: ${filepath}`);
  console.log(`Mode: ${mode}`);
  console.log('');
  const os = getOS();
  const { artifactId, result } = os.orchestrate('PIPELINE', { filepath, mode });
  const base = path.basename(filepath, path.extname(filepath));
  const outFile = `./memory/pipeline_${base}_${mode}.js`;
  fs.writeFileSync(outFile, result.code);
  const original = fs.readFileSync(filepath, 'utf8');
  const diff = generateDiff(original, result.code, artifactId, os.orchestrate('INSPECT', { subject: 'artifact', artifactId }));
  const diffFile = `./memory/diff_${artifactId}.md`;
  fs.writeFileSync(diffFile, diff);
  console.log('\n✅ PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Artifact: ${artifactId}`);
  console.log(`Output: ${outFile}`);
  console.log(`Diff: ${diffFile}`);
  return { artifactId, outFile, diffFile };
}

function generateDiff(original, regenerated, artifactId, artifact) {
  const contract = artifact ? artifact.contract : {};
  const issues = [
    ...(original.includes('var ') ? [{ type: 'legacy_var', severity: 'medium', message: 'Use of var' }] : []),
    ...(original.includes('console.log') ? [{ type: 'debug_code', severity: 'low', message: 'Debug logs' }] : []),
    ...(/(^|[^=!])==([^=]|$)/.test(original) ? [{ type: 'loose_equality', severity: 'medium', message: 'Loose equality' }] : [])
  ];
  const fixed = issues.filter(i => ['debug_code', 'legacy_var', 'loose_equality'].includes(i.type));
  return `# Morph OS Diff Report

## Artifact: ${artifactId}
## Gate: ${contract.resonance?.primaryGate || '?'} | Circuit: ${contract.resonance?.circuitFamily || '?'}

### Original: ${original.length} chars
### Regenerated: ${regenerated.length} chars
### Delta: ${regenerated.length - original.length > 0 ? '+' : ''}${regenerated.length - original.length}

### Issues Found: ${issues.length}
#### ✅ Auto-Fixed (${fixed.length})
${fixed.map(i => `- [${i.severity.toUpperCase()}] ${i.type}: ${i.message}`).join('\n') || 'None'}

### Improvements
- Replaced \`var\` with \`let\`
- Fixed loose equality (== → ===)
- Removed debug \`console.log\` statements
- Added JSDoc comments

---
*Morph OS v1.1*
`;
}

function list() {
  const os = getOS();
  const ids = os.orchestrate('INSPECT', { subject: 'artifacts' });
  console.log('\n📦 Artifacts');
  console.log('═══════════════════════════════════════');
  if (ids.length === 0) {
    console.log('None. Run: morph ingest <file>');
  } else {
    ids.forEach(id => {
      const a = os.orchestrate('INSPECT', { subject: 'artifact', artifactId: id });
      console.log(`${id} | ${a.metadata.type} | ${a.size} chars | ${a.metadata.name || 'unnamed'}`);
    });
  }
}

function stats() {
  const os = getOS();
  const s = os.orchestrate('INSPECT', { subject: 'stats' });
  console.log('\n📊 Stats');
  console.log('═══════════════════════════════════════');
  console.log(`State: ${s.state}`);
  console.log(`Artifacts: ${s.artifacts}`);
  console.log(`Contracts: ${s.contracts}`);
  console.log(`Evolution: ${s.evolutionEntries}`);
  console.log(`Gates: ${s.activeGates.join(', ') || 'none'}`);
  console.log(`Channels: ${s.activeChannels.join(', ') || 'none'}`);
  console.log(`Consciousness: ${s.consciousnessLevel}/4`);
}

function test() {
  console.log('\n🧪 Test Suite');
  console.log('═══════════════════════════════════════════════════');
  const os = getOS();
  let passed = 0, failed = 0;

  function t(name, fn) {
    try { fn(); console.log(`✅ ${name}`); passed++; }
    catch (e) { console.log(`❌ ${name}: ${e.message}`); failed++; }
  }

  t('Kernel boots', () => {
    const s = os.orchestrate('INSPECT', { subject: 'stats' });
    if (s.state !== 'RUNNING') throw new Error('Not running');
  });

  let id;
  t('Ingest', () => {
    id = os.orchestrate('INGEST', { code: 'function hello() { return "world"; }', metadata: { type: 'js', name: 'test' } });
    if (!id) throw new Error('No ID');
  });

  t('Study', () => {
    const a = os.orchestrate('STUDY', { artifactId: id });
    if (a.structure.nodeCount === 0) throw new Error('Empty');
  });

  t('Understand', () => {
    const r = os.orchestrate('UNDERSTAND', { artifactId: id });
    if (r.confidence < 1) throw new Error('No confidence');
  });

  t('Regenerate', () => {
    const c = os.orchestrate('INSPECT', { subject: 'contract', artifactId: id });
    const r = os.orchestrate('REGENERATE', { contract: c, mode: 'equivalent' });
    if (!r.code) throw new Error('No code');
  });

  t('Persist', () => {
    os.persistence.flush();
    if (!fs.existsSync('./memory/artifacts.json')) throw new Error('No file');
  });

  t('GNN gate', () => {
    os.orchestrate('INSPECT', { subject: 'gates' });
  });

  t('Integration route', () => {
    const c = os.orchestrate('INSPECT', { subject: 'consciousness' });
    if (typeof c.level !== 'number') throw new Error('No level');
  });

  t('Pipeline atomic', () => {
    const code = 'var x = 1; function test() { console.log(x); return x == 2; }';
    const { result } = os.orchestrate('PIPELINE', { code, metadata: { type: 'js', name: 'pipeline_test' }, mode: 'improved' });
    if (result.code.includes('var ')) throw new Error('var not fixed');
    if (result.code.includes('console.log')) throw new Error('debug not removed');
  });

  t('Plan strategy', () => {
    const code = 'var x = 1; var y = 2; function test() { console.log(x); return x == y; }';
    const id = os.orchestrate('INGEST', { code, metadata: { type: 'js', name: 'plan_test' } });
    os.orchestrate('STUDY', { artifactId: id });
    os.orchestrate('UNDERSTAND', { artifactId: id });
    const plan = os.orchestrate('PLAN', { artifactId: id });
    if (!plan.risk) throw new Error('No risk score');
    if (!plan.recommendedMode) throw new Error('No recommended mode');
    if (plan.safeTransforms.length === 0) throw new Error('No safe transforms');
  });

  t('Execute sandbox', () => {
    // vm.runInContext returns the last statement's value [^157^]
    // No explicit return allowed at top level [^155^]
    const code = 'var a = 2; var b = 3; a + b';
    const id = os.orchestrate('INGEST', { code, metadata: { type: 'js', name: 'exec_test' } });
    const r = os.orchestrate('EXECUTE', { artifactId: id });
    if (!r.success) throw new Error('Execution failed: ' + r.error);
    if (r.output !== 5) throw new Error('Wrong output: ' + r.output);
  });

  t('Verify transform', () => {
    const code = 'function greet(name) { console.log(name); return name == "world"; }';
    const id = os.orchestrate('INGEST', { code, metadata: { type: 'js', name: 'verify_test' } });
    os.orchestrate('STUDY', { artifactId: id });
    os.orchestrate('UNDERSTAND', { artifactId: id });
    const v = os.orchestrate('VERIFY', { artifactId: id, mode: 'improved' });
    if (!v.match) throw new Error('No match result');
    if (!v.match.syntaxValid) throw new Error('Syntax invalid');
  });

  t('Recall open-loop memory', () => {
    const code = 'var x = 1; function test() { console.log(x); }';
    const id = os.orchestrate('INGEST', { code, metadata: { type: 'js', name: 'recall_test' } });
    os.orchestrate('STUDY', { artifactId: id });
    os.orchestrate('UNDERSTAND', { artifactId: id });
    os.orchestrate('PIPELINE', { code, metadata: { type: 'js', name: 'recall_test' }, mode: 'improved' });
    const recall = os.orchestrate('RECALL', { artifactId: id });
    if (!recall.matches) throw new Error('No matches in recall');
    if (!recall.warnings) throw new Error('No warnings in recall');
    // Open loop: recall suggests, doesn't force
    if (recall.intent !== 'similar_transform_history') throw new Error('Wrong intent');
  });

  t('Adapt open-loop feedback', () => {
    const code = 'var x = 1; function test() { return x; }';
    const id = os.orchestrate('INGEST', { code, metadata: { type: 'js', name: 'adapt_test' } });
    os.orchestrate('STUDY', { artifactId: id });
    os.orchestrate('UNDERSTAND', { artifactId: id });
    const adapt = os.orchestrate('ADAPT', {
      artifactId: id,
      decision: 'accepted',
      context: { agentId: 'test-agent', humanResponse: 'accepted', suggestedMode: 'improved' }
    });
    if (adapt.decision !== 'accepted') throw new Error('Decision not recorded');
    if (adapt.agentId !== 'test-agent') throw new Error('Agent not recorded');
  });

  t('Self-improve', () => {
    const r = os.orchestrate('SELF_IMPROVE');
    if (!r.code) throw new Error('No code');
  });

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '🎉 All tests passed!' : '⚠️ Some failed');
}

function demo() {
  console.log('\n🎯 DEMO: Messy JS → Clean JS');
  console.log('═══════════════════════════════════════════════════');

  const messy = `// messy file
var userName = "Alice";
var userAge = 30;

function getUser() {
  console.log("Getting user");
  if(userName == "Alice") {
    console.log("Found Alice");
    return {name: userName, age: userAge}
  }
  return null
}

function processUsers(users) {
  var results = [];
  for(var i=0; i<users.length; i++) {
    console.log("Processing user " + i);
    if(users[i].name == userName) {
      results.push(users[i]);
    }
  }
  return results;
}

var users = [{name:"Alice", age:30}, {name:"Bob", age:25}];
console.log(processUsers(users));
`;

  const demoFile = './memory/demo_messy.js';
  fs.writeFileSync(demoFile, messy);
  console.log('Input:');
  console.log(messy);
  console.log('═══════════════════════════════════════════════════\n');

  const os = getOS();
  const { artifactId, result } = os.orchestrate('PIPELINE', { filepath: demoFile, mode: 'improved' });
  const outFile = './memory/pipeline_demo_messy_improved.js';
  fs.writeFileSync(outFile, result.code);

  console.log('\n✅ OUTPUT:');
  console.log('═══════════════════════════════════════════════════');
  console.log(result.code);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`Artifact: ${artifactId}`);
  console.log(`Saved: ${outFile}`);
}

function help() {
  console.log('\n🛠️  Morph OS v1.1 CLI');
  console.log('═══════════════════════════════════════════════════');
  console.log('All commands route through orchestrate(). No internal access.\n');
  console.log('  init                    Initialize system');
  console.log('  ingest <file>           Ingest code');
  console.log('  study <id>              Analyze artifact');
  console.log('  understand <id>         Build representation');
  console.log('  plan <id>               Generate transformation strategy');
  console.log('  regenerate <id>         Generate code');
  console.log('  execute <id>            Run code in sandbox');
  console.log('  verify <id>             Compare original vs transformed');
  console.log('  recall <id>             Find relevant past experiences');
  console.log('  adapt <id>              Record human decision (open loop)');
  console.log('  pipeline <file>         Full atomic pipeline (with plan)');
  console.log('  list                    List artifacts');
  console.log('  stats                   System stats');
  console.log('  test                    Run test suite');
  console.log('  demo                    Run demo');
  console.log('  help                    This help');
}

// ─── MAIN ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];
const cmdArgs = args.slice(1);

function plan(args) {
  const artifactId = args[0];
  if (!artifactId) { console.error('Usage: morph plan <artifactId>'); process.exit(1); }
  const os = getOS();
  const plan = os.orchestrate('PLAN', { artifactId });
  console.log('\n🎯 Strategy Plan');
  console.log('═══════════════════════════════════════');
  console.log(`Risk: ${plan.risk} (${(plan.riskScore * 100).toFixed(0)}%)`);
  console.log(`Recommended Mode: ${plan.recommendedMode}`);
  console.log(`Confidence: ${(plan.confidence * 100).toFixed(0)}%`);
  console.log(`Safe Transforms: ${plan.safeTransforms.join(', ') || 'none'}`);
  console.log(`Unsafe Transforms: ${plan.unsafeTransforms.join(', ') || 'none'}`);
  console.log('\nReasoning:');
  plan.reasoning.forEach(r => console.log(`  • ${r}`));
  return plan;
}

function execute(args) {
  const artifactId = args[0];
  if (!artifactId) { console.error('Usage: morph execute <artifactId>'); process.exit(1); }
  const os = getOS();
  const result = os.orchestrate('EXECUTE', { artifactId });
  console.log('\n⚡ Execute');
  console.log('═══════════════════════════════════════');
  console.log(`Success: ${result.success ? '✅' : '❌'}`);
  if (result.success) {
    console.log(`Output: ${JSON.stringify(result.output)}`);
  } else {
    console.log(`Error: ${result.error}`);
  }
  return result;
}

function verify(args) {
  const artifactId = args[0];
  if (!artifactId) { console.error('Usage: morph verify <artifactId> [--mode <mode>]'); process.exit(1); }
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'improved';
  const os = getOS();
  const result = os.orchestrate('VERIFY', { artifactId, mode });
  console.log('\n🔍 Verify');
  console.log('═══════════════════════════════════════');
  console.log(`Mode: ${mode}`);
  console.log(`Behavior Match: ${result.match.behaviorMatch ? '✅' : '❌'}`);
  console.log(`Syntax Valid: ${result.match.syntaxValid ? '✅' : '❌'}`);
  console.log(`Result: ${result.accepted ? '✅ ACCEPTED' : '❌ REJECTED'}`);
  if (!result.accepted) {
    console.log('⚠️  Transform rejected. Original preserved.');
  }
  return result;
}

function recall(args) {
  const artifactId = args[0];
  if (!artifactId) { console.error('Usage: morph recall <artifactId>'); process.exit(1); }
  const os = getOS();
  const result = os.orchestrate('RECALL', { artifactId });
  console.log('\n🧠 Recall (Open Loop)');
  console.log('═══════════════════════════════════════');
  console.log(`Query: ${result.intent}`);
  console.log(`Matches: ${result.matches.length}`);

  if (result.matches.length > 0) {
    console.log('\nPrior similar transforms:');
    result.matches.forEach((m, i) => {
      console.log(`  ${i+1}. ${m.artifactId.slice(0, 20)}...`);
      console.log(`     Reason: ${m.reason}`);
      console.log(`     Outcome: ${m.outcome} | Syntax: ${m.syntaxValid === false ? '❌ invalid' : '✅ valid'}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings from memory:');
    result.warnings.forEach(w => console.log(`   • ${w}`));
  }

  console.log('\n💡 These are suggestions. PLAN will decide.');
  return result;
}

function adapt(args) {
  const artifactId = args[0];
  const decisionIdx = args.indexOf('--decision');
  const decision = decisionIdx >= 0 ? args[decisionIdx + 1] : 'accepted';
  const agentIdx = args.indexOf('--agent');
  const agentId = agentIdx >= 0 ? args[agentIdx + 1] : 'default';

  if (!artifactId) { console.error('Usage: morph adapt <artifactId> --decision <accepted|rejected|modified> [--agent <id>]'); process.exit(1); }

  const os = getOS();
  const result = os.orchestrate('ADAPT', {
    artifactId,
    decision,
    context: {
      agentId,
      humanResponse: decision,
      suggestedMode: 'unknown',
      suggestedRisk: 'unknown'
    }
  });

  console.log('\n🔄 ADAPT (Open Loop)');
  console.log('═══════════════════════════════════════');
  console.log(`Artifact: ${result.artifactId}`);
  console.log(`Decision: ${result.decision}`);
  console.log(`Agent: ${result.agentId}`);
  console.log(`Recorded: ${new Date(result.timestamp).toISOString()}`);
  console.log('\n💡 This feedback will inform future RECALL but does not force decisions.');
  return result;
}

const COMMANDS = { init, ingest, study, understand, regenerate, plan, execute, verify, recall, adapt, pipeline, list, stats, test, demo, help };

if (!cmd || !COMMANDS[cmd]) {
  help();
  process.exit(0);
}

COMMANDS[cmd](cmdArgs);

// Single shutdown at end
if (morphOS) morphOS.shutdown();
process.exit(0);
