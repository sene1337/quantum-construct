// Every number the construct shows, and where it comes from. Checked 26 September 2026.
// {n:id} marks a source; the page turns it into a numbered link into the Sources list.
// Where sources disagree, the construct shows the range.

export const SOURCES = [
  // The machine that breaks keys
  { id: 'google26', short: 'Babbush, Gidney, Boneh, Drake et al. (Google Quantum AI), 2026', title: '"Securing elliptic curve cryptocurrencies against quantum vulnerabilities: resource estimates and mitigations", arXiv:2603.28846, v2 15 April 2026.', note: 'Under 1,200 logical qubits and 90 million Toffoli gates, or under 1,450 and 70 million; under 500,000 physical qubits at a 0.1% error rate; 18 or 23 minutes a key, about 9 or 12 from a precomputed start; on-spend success just under 41% against 10-minute blocks; 1.7 million BTC in P2PK; about 6.9 million BTC in vulnerable addresses; proof-of-work section. Circuits withheld; checked by a zero-knowledge proof.', url: 'https://arxiv.org/abs/2603.28846', host: 'arxiv.org' },
  { id: 'ionq26', short: 'Häner, Tripier, Young et al. (IonQ), 2026', title: '"Computing 256-bit elliptic curve discrete logarithms in 26 days on a fault-tolerant trapped-ion quantum computer with 20,000 qubits", arXiv:2609.05625, 4 September 2026.', note: '19,397 physical qubits, about 1,450 logical, 25.7 days per attempt.', url: 'https://arxiv.org/abs/2609.05625', host: 'arxiv.org' },
  { id: 'cain26', short: 'Cain, Xu, King et al. (Oratomic, Caltech, UC Berkeley), 2026', title: '"Shor’s algorithm is possible with as few as 10,000 reconfigurable atomic qubits", arXiv:2603.28627, 30 March 2026.', note: 'Neutral atoms, Figure 3c: about 26,000 qubits for about 10 days per key (preliminary; assumes a 1 ms cycle); 9,739 qubits for about 1,000 days.', url: 'https://arxiv.org/abs/2603.28627', host: 'arxiv.org' },
  { id: 'roetteler17', short: 'Roetteler, Naehrig, Svore, Lauter, 2017', title: '"Quantum resource estimates for computing elliptic curve discrete logarithms", ASIACRYPT 2017, arXiv:1706.06752.', note: '2,330 logical qubits and about 1.26 × 10¹¹ Toffoli gates for a 256-bit curve.', url: 'https://arxiv.org/abs/1706.06752', host: 'arxiv.org' },
  { id: 'webber22', short: 'Webber, Elfving, Weidt, Hensinger, 2022', title: '"The impact of hardware specifications on reaching quantum advantage in the fault tolerant regime", AVS Quantum Science 4, 013801.', note: '13 million physical qubits to break a bitcoin key in one day; 317 million in one hour.', url: 'https://doi.org/10.1116/5.0073075', host: 'doi.org' },
  // What exists today
  { id: 'willowspec', short: 'Google Quantum AI, Willow spec sheet, December 2024', title: 'Willow processor specifications.', note: '105 qubits.', url: 'https://quantumai.google/static/site-assets/downloads/willow-spec-sheet.pdf', host: 'quantumai.google' },
  { id: 'willow', short: 'Google Quantum AI, 2024', title: '"Quantum error correction below the surface code threshold", arXiv:2408.13687 (Nature 638, 2025).', note: 'A distance-7 surface-code memory at 0.143% error per cycle.', url: 'https://arxiv.org/abs/2408.13687', host: 'arxiv.org' },
  { id: 'condor', short: 'IBM, December 2023', title: '"The hardware and software for the era of quantum utility is here" (IBM Quantum blog).', note: 'Condor: 1,121 superconducting qubits on one chip.', url: 'https://www.ibm.com/quantum/blog/quantum-roadmap-2033', host: 'ibm.com' },
  { id: 'helios', short: 'Quantinuum, Nature, 2026', title: '"A 98-qubit trapped-ion quantum computer with all-to-all connectivity", Nature 655, 81–86 (2026); open copy on PMC.', note: '98 qubits; average two-qubit error 7.9 × 10⁻⁴.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13322971/', host: 'pmc.ncbi.nlm.nih.gov' },
  { id: 'helios48', short: 'Quantinuum, 2026', title: '"Computing with many encoded logical qubits beyond break-even", arXiv:2602.22211, 25 February 2026.', note: 'Between 48 and 94 logical qubits: 94 on an error-detecting code, 48 on a distance-4 correcting code, with postselection.', url: 'https://arxiv.org/abs/2602.22211', host: 'arxiv.org' },
  { id: 'quera25', short: 'Harvard, MIT, QuEra, 2025', title: '"Architectural mechanisms of a universal fault-tolerant quantum computer", arXiv:2506.20661 (Nature, 2025).', note: 'Up to 448 atoms running error-corrected circuits; up to 96 logical qubits at distance 4, postselected.', url: 'https://arxiv.org/abs/2506.20661', host: 'arxiv.org' },
  { id: 'caltech6100', short: 'Caltech, September 2025', title: '"Caltech team sets record with 6,100-qubit array".', note: 'Atoms held and controlled; entangling them across the array is the next step.', url: 'https://www.caltech.edu/about/news/caltech-team-sets-record-with-6100-qubit-array', host: 'caltech.edu' },
  { id: 'qday', short: 'Project Eleven, April 2026', title: '"Project Eleven awards 1 BTC Q-Day Prize for largest quantum attack on elliptic curve cryptography to date".', note: 'A 15-bit key (search space 32,767) on cloud quantum hardware; the previous record was 6 bits.', url: 'https://www.prnewswire.com/news-releases/project-eleven-awards-1-btc-q-day-prize-for-largest-quantum-attack-on-elliptic-curve-cryptography-to-date-302752439.html', host: 'prnewswire.com' },
  { id: 'ibm', short: 'IBM, June 2025', title: '"IBM sets the course to build world’s first large-scale, fault-tolerant quantum computer".', note: 'Starling, 2029: 200 logical qubits, 100 million operations.', url: 'https://newsroom.ibm.com/2025-06-10-IBM-Sets-the-Course-to-Build-Worlds-First-Large-Scale,-Fault-Tolerant-Quantum-Computer-at-New-IBM-Quantum-Data-Center', host: 'newsroom.ibm.com' },
  { id: 'gri25', short: 'Mosca and Piani, Global Risk Institute, March 2026', title: 'Quantum Threat Timeline Report 2025 (26 experts).', note: 'Chance of a machine that breaks RSA-2048 within 24 hours: 28–49% within 10 years, 51–70% within 15.', url: 'https://globalriskinstitute.org/publication/quantum-threat-timeline-report-2025b/', host: 'globalriskinstitute.org' },
  // The proof
  { id: 'grover96', short: 'Grover, 1996', title: '"A fast quantum mechanical algorithm for database search", STOC 1996, arXiv:quant-ph/9605043.', note: 'Search in about √N steps: a square-root speedup.', url: 'https://arxiv.org/abs/quant-ph/9605043', host: 'arxiv.org' },
  { id: 'bbbv97', short: 'Bennett, Bernstein, Brassard, Vazirani, 1997', title: '"Strengths and weaknesses of quantum computing", SIAM J. Comput. 26(5), arXiv:quant-ph/9701001.', note: 'No quantum algorithm searches faster than Grover’s square root.', url: 'https://arxiv.org/abs/quant-ph/9701001', host: 'arxiv.org' },
  { id: 'zalka99', short: 'Zalka, 1999', title: '"Grover’s quantum searching algorithm is optimal", Phys. Rev. A 60, 2746, arXiv:quant-ph/9711070.', note: 'Splitting the search across machines gains no more than splitting the search space.', url: 'https://arxiv.org/abs/quant-ph/9711070', host: 'arxiv.org' },
  { id: 'kardashev26', short: 'Dallaire-Demers and BTQ Technologies, 2026', title: '"Kardashev scale quantum computing for bitcoin mining", arXiv:2603.25519, March 2026 (company preprint).', note: 'At bitcoin’s January 2025 difficulty: about 10²³ qubits and 10²⁵ W; today’s network uses about 10–15 GW.', url: 'https://arxiv.org/abs/2603.25519', host: 'arxiv.org' },
  { id: 'sun', short: 'NASA, Sun fact sheet', title: 'Sun fact sheet, NASA Goddard Space Flight Center.', note: 'Luminosity 3.828 × 10²⁶ W, so 10²⁵ W is about 2.6% of it.', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html', host: 'nssdc.gsfc.nasa.gov' },
  // Which coins show a key
  { id: 'p11', short: 'Project Eleven, Bitcoin Risq List, September 2026', title: 'Weekly exposure count, block 966,848 (14 September 2026).', note: '8,177,337 BTC in total: P2PK 1,715,434; address reuse 6,188,493; Taproot 273,125. The jump since July is not explained by the publisher.', url: 'https://bitcoin-risq-list.projecteleven.com/metrics', host: 'projecteleven.com' },
  { id: 'p11feb', short: 'Project Eleven, February 2026', title: 'Bitcoin quantum report, block 936,882.', note: '6,909,255 BTC exposed: 4,994,044 through address reuse, 1,716,814 in P2PK, 198,106 in Taproot outputs.', url: 'https://report.projecteleven.com/section-2/elliptic-curve-digital-signatures', host: 'projecteleven.com' },
  { id: 'glassnode26', short: 'Glassnode, 20 May 2026', title: '"Measuring bitcoin’s quantum-exposed supply".', note: '6.04 million BTC (30.2%): 1.92 million structural, 4.12 million through reuse; exchanges 1.66 million.', url: 'https://research.glassnode.com/measuring-bitcoins-quantum-exposed-supply/', host: 'glassnode.com' },
  { id: 'lerner19', short: 'Lerner, 2019', title: '"The return of the deniers and the revenge of Patoshi" (Bitslog).', note: 'Satoshi mined about 1.1 million BTC; almost none has moved.', url: 'https://bitslog.com/2019/04/16/the-return-of-the-deniers-and-the-revenge-of-patoshi/', host: 'bitslog.com' },
  { id: 'block1', short: 'mempool.space, block 1', title: 'The coinbase of block 1 (9 January 2009): 50 BTC paid to a raw 65-byte public key, unspent on 26 September 2026.', note: 'Transaction 0e3e2357…9efd512098.', url: 'https://mempool.space/tx/0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098', host: 'mempool.space' },
  { id: 'chaincode25', short: 'Milton and Shikhelman (Chaincode Labs), May 2025', title: '"Bitcoin and quantum computing: current status and future directions".', note: 'Which outputs expose keys, why reuse matters, the Taproot key path, and moving coins to hashed addresses.', url: 'https://chaincode.com/bitcoin-post-quantum.pdf', host: 'chaincode.com' },
  // The fix
  { id: 'bip360', short: 'BIP-360, Pay-to-Merkle-Root (P2MR)', title: 'Beast, Heilman, Foxen Duke. Status: Draft; merged into the BIPs repository 11 February 2026.', note: 'A Taproot-like output with the key path removed; resists long-exposure attacks; adds no post-quantum signatures itself. Not in Bitcoin Core, not activated.', url: 'https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki', host: 'github.com' },
  { id: 'bip361', short: 'BIP-361, Post Quantum Migration and Legacy Signature Sunset', title: 'Lopp et al. Status: Draft (Informational); merged 14 April 2026.', note: 'Phase A stops sends to vulnerable outputs; phase B restricts old signatures to a rescue protocol. Requires a post-quantum signature BIP that does not exist yet.', url: 'https://github.com/bitcoin/bips/blob/master/bip-0361.mediawiki', host: 'github.com' },
  { id: 'hourglass', short: 'Hourglass V2, February 2026', title: '"Hourglass V2 Update", bitcoin-dev mailing list (Beast and Casey): cap spending from P2PK outputs at about 1 BTC per block.', note: 'No BIP number; a draft.', url: 'https://groups.google.com/g/bitcoindev/c/0E1UyyQIUA0', host: 'groups.google.com' },
  { id: 'shrincs', short: 'SHRINCS draft, August 2026', title: '"SHRINCS: an efficient hash-based signature scheme for Bitcoin (first draft)", bitcoin-dev mailing list.', note: 'Its authors say it is not yet ready for the BIPs repository; no post-quantum signature has a BIP number.', url: 'https://groups.google.com/g/bitcoindev/c/HbVboXIFiG8', host: 'groups.google.com' },
  { id: 'fips', short: 'NIST, August 2024', title: 'Post-quantum standards FIPS 203, 204 and 205, approved 13 August 2024.', note: '', url: 'https://csrc.nist.gov/projects/post-quantum-cryptography', host: 'csrc.nist.gov' },
  { id: 'nist8547', short: 'NIST IR 8547 (initial public draft), November 2024', title: '"Transition to post-quantum cryptography standards".', note: 'Elliptic-curve signatures at 128-bit strength: disallowed after 2035. Still a draft.', url: 'https://csrc.nist.gov/pubs/ir/8547/ipd', host: 'csrc.nist.gov' },
  { id: 'eo14412', short: 'US Executive Order 14412, June 2026', title: '"Securing the nation against advanced cryptographic attacks" (Federal Register 2026-12909).', note: 'High-value federal systems: post-quantum signatures by 31 December 2031.', url: 'https://www.federalregister.gov/documents/2026/06/25/2026-12909/securing-the-nation-against-advanced-cryptographic-attacks', host: 'federalregister.gov' },
  // The chain and the math
  { id: 'mempool', short: 'mempool.space, 26 September 2026', title: 'Block height 968,751; recent block hashes; difficulty 1.33 × 10¹⁴; hash rate about 9.4 × 10²⁰ hashes a second.', note: 'Read at 23:20 UTC.', url: 'https://mempool.space/block/00000000000000000000ccd4e4e6f0e39b219b1ddabcf065bfa7808303128376', host: 'mempool.space' },
  { id: 'supply', short: 'blockchain.com, 26 September 2026', title: 'Total bitcoin issued: 20,089,834.', note: '', url: 'https://blockchain.info/q/totalbc', host: 'blockchain.info' },
  { id: 'sec2', short: 'SEC 2 v2, Certicom Research, 2010', title: '"Recommended elliptic curve domain parameters", section 2.4.1: secp256k1.', note: 'y² = x³ + 7 over a 256-bit prime field; group order about 1.16 × 10⁷⁷.', url: 'https://www.secg.org/sec2-v2.pdf', host: 'secg.org' },
  { id: 'safecurves', short: 'Bernstein and Lange, SafeCurves', title: 'Rho cost for each curve.', note: 'secp256k1: about 2¹²⁷·⁸ steps for the best known classical attack.', url: 'https://safecurves.cr.yp.to/rho.html', host: 'safecurves.cr.yp.to' },
  { id: 'deutsch85', short: 'Deutsch, 1985', title: '"Quantum theory, the Church–Turing principle and the universal quantum computer", Proc. R. Soc. A 400, 97–117.', note: 'The universal quantum computer, and Deutsch’s argument that its power points to many worlds.', url: 'https://doi.org/10.1098/rspa.1985.0070', host: 'doi.org' },
];

// The real chain tip, from mempool.space on 26 September 2026 (oldest first).
export const CHAIN = {
  blocks: [
    ['968737', '000000000000000000019627c1150da29f1a60b231e4a7edc672d78b3ed2dedc'],
    ['968738', '00000000000000000001dd14225c08005d8b44d9a16a2c8ce91695e005bf0c13'],
    ['968739', '0000000000000000000111250201cab1e4298ecee5b521b970e261d1bfc38726'],
    ['968740', '000000000000000000001dcb2eb9ee2479851be7547742abe90fb0a5c3b466f0'],
    ['968741', '000000000000000000002de21bc858c0fe7a3163b927a7dabc824142da783234'],
    ['968742', '00000000000000000001a88179e7d92e0b5c2a0a9b845d29367c1378f810d713'],
    ['968743', '00000000000000000000d571ec430053f13c3f3efce9a79128f72a8a8643958f'],
    ['968744', '0000000000000000000070d699813720755c550e8c73021995a21962d8c2b1cd'],
    ['968745', '0000000000000000000092e9383d071e2e7760bcfa71f80d2e14af2805df77b7'],
    ['968746', '000000000000000000013a5ac8fd33b9135ff4f39e3ae96f82033737587ce53d'],
    ['968747', '000000000000000000002a4e335b545f5d0cbc159a20e2d3b254dd5467a03ad3'],
    ['968748', '00000000000000000000b2a3eea2368790e23bd29a76e0ea108f1312f02c5ea0'],
    ['968749', '000000000000000000002c0adc153cf64bac8440660dfa8104329cb7fbf09751'],
    ['968750', '00000000000000000001faa7eef315c0b82a8b59afa0c2c6510b1f776d275083'],
    ['968751', '00000000000000000000ccd4e4e6f0e39b219b1ddabcf065bfa7808303128376'],
  ].map(([h, hash]) => ({ height: +h, hash })),
  grover: 'A quantum computer can’t print this proof either.\nZoom out to machine B ▴',
};

export const LEVEL_TEXT = {
  dawn: { kicker: 'Out 4 · where it leaves bitcoin', name: 'Can’t print the proof', text: 'The proof of work holds. The weak spot is keys already on chain: about 6–8 million BTC{n:glassnode26}{n:p11}. Coins that can move can hide their keys again. For the rest, bitcoin’s fixes are still drafts{n:bip360}{n:bip361}.' },
  machineB: { kicker: 'Out 3 · the machine that attacks the proof', name: 'Machine B: the proof attacker', text: 'Grover’s algorithm can at best square-root the work of mining{n:grover96}{n:bbbv97}. At bitcoin’s difficulty that takes about <b>10²³</b> qubits and <b>10²⁵</b> watts{n:kardashev26}. The machine that matters is the speck by the water.' },
  machineA: { kicker: 'Out 2 · the machine that breaks keys', name: 'Machine A: the key breaker', text: 'One bitcoin key, in Google’s 2026 estimate: <b>1,200–1,450</b> logical qubits on fewer than <b>500,000</b> physical ones, <b>9–23</b> minutes a key{n:google26}. Designs with fewer qubits take days to years{n:ionq26}{n:cain26}. None has been built.' },
  today: { kicker: 'Out 1 · what exists', name: 'Today’s machines', text: 'The best run about <b>100</b> logical qubits, on small codes that throw away failed runs{n:quera25}{n:helios48}. The largest elliptic-curve key broken on quantum hardware is <b>15</b> bits{n:qday}. Bitcoin’s keys are <b>256</b> bits.' },
  person: { kicker: 'Start · a person, a wallet', name: 'Pick a target', text: 'Five things a quantum computer might aim at. Pick one on the rack or below, then run the attack. Zoom in for the math, out for the machine.' },
  app: { kicker: 'In 1', name: 'The wallet app', text: 'The balance is not in the phone. It is coins recorded on the chain, locked to a key that only your seed can make.' },
  chain: { kicker: 'In 2', name: 'The timechain', text: '<b>968,751</b> blocks since 2009. Each carries a proof of work: the network makes about <b>9.4 × 10²⁰</b> guesses a second to find a hash that starts with about 20 zeros{n:mempool}.' },
  utxo: { kicker: 'In 3', name: 'The UTXO set', text: 'Every coin is a locked box. 2026 studies find <b>6.0–6.9 million</b> BTC behind keys already on chain{n:glassnode26}{n:google26}{n:p11feb}; Project Eleven’s latest count is <b>8.2 million</b>{n:p11}. The rest show only a hash.' },
  script: { kicker: 'In 4', name: 'The locking script', text: 'What the chain stores for a coin decides everything. A public key is a target. A hash of one is not, until you spend{n:bip360}.' },
  curve: { kicker: 'In 5', name: 'secp256k1', text: 'The curve y² = x³ + 7{n:sec2}. A public key is a point, P = k·G. Shor’s algorithm could find k, but only for a point it can see.' },
  trapdoor: { kicker: 'In 6', name: 'The trapdoor', text: 'Forward is easy. Backward, the best classical attack takes about <b>2¹²⁸</b> steps{n:safecurves}. Shor’s algorithm would turn the cliff into stairs.' },
  key: { kicker: 'In 7 · the bottom', name: 'The private key', text: 'One number out of about <b>1.16 × 10⁷⁷</b>{n:sec2}. A seed phrase is the number a wallet’s keys come from, written as words.' },
};

// Today's machines (O1), left to right.
export const MACHINES = [
  { kind: 'sc', text: 'Google Willow\n{o:105} qubits{n:willowspec}\nbelow the error threshold{n:willow}' },
  { kind: 'sc', text: 'IBM Condor\n{o:1,121} qubits\non one chip, 2023{n:condor}' },
  { kind: 'ion', text: 'Quantinuum Helios\n{o:98} ions{n:helios}\n{o:48} logical, with discards{n:helios48}' },
  { kind: 'atom', text: 'Harvard · MIT · QuEra\n{o:448} atoms in circuits\nup to {o:96} logical{n:quera25}' },
  { kind: 'atom', text: 'Caltech\n{o:6,100} atoms held,\nnot yet entangled{n:caltech6100}' },
];

// The road from here, shown with the outermost level.
export const TIMELINE = {
  items: [
    { year: '2024', text: 'NIST approves post-quantum standards{n:fips}' },
    { year: '2026', text: 'BIP-360 and BIP-361 published as drafts{n:bip360}{n:bip361}' },
    { year: '2029', text: 'IBM\u2019s target: 200 logical qubits{n:ibm}' },
    { year: '2031', text: 'US federal systems: post-quantum signatures{n:eo14412}' },
    { year: '2035', text: 'NIST draft: elliptic-curve signatures disallowed{n:nist8547}' },
  ],
  odds: 'Experts asked in 2025: a code-breaking machine is <b>28\u201349%</b> likely within 10 years, <b>51\u201370%</b> within 15{n:gri25}.',
};

export const NUM = {
  b: {
    cast: 'to out-mine bitcoin with Grover’s algorithm, on about 10²³ qubits{n:kardashev26}:\na few percent of all the Sun puts out{n:sun}',
    grover: '{g:GROVER’S ALGORITHM}\nsearches at best a square root faster{n:grover96}{n:bbbv97}\nand splits badly across machines{n:zalka99}',
    today: 'Today’s whole network runs on about 10–15 GW{n:kardashev26}.\nA fantastically fast quantum miner: about 0.25 TH/s.\nOne ordinary mining machine: 110 TH/s{n:google26}.',
    speck: 'Machine A, the key breaker: that speck ▾',
  },
  a: {
    castNote: 'physical qubits to break one bitcoin key in minutes{n:google26}',
    spec: '{g:MACHINE A · THE KEY BREAKER}\n{o:1,200–1,450} logical qubits\n{o:70–90 million} Toffoli gates\n{o:< 500,000} physical qubits\n{o:9–23} minutes a key\nat a 0.1% physical error rate{n:google26}\n{m:The hall is an illustration.}',
    others: '{g:FEWER QUBITS, FAR SLOWER}\n{o:19,397} trapped ions: about 26 days a key{n:ionq26}\n{o:~26,000} atoms: about 10 days{n:cain26}\n{o:~9,700} atoms: about 1,000 days{n:cain26}\n{g:THE ESTIMATES KEEP FALLING}\n2017: {o:2,330} logical, {o:126 billion} gates{n:roetteler17}\n2022: {o:13 million} physical for one day{n:webber22}',
  },
  today: {
    cast: '15 BITS',
    castNote: 'the largest elliptic-curve key broken on a quantum computer{n:qday}. Bitcoin’s keys: 256 bits.',
    needed: '{g:NEEDED FOR ONE BITCOIN KEY}\n{o:1,200–1,450} logical qubits{n:google26}\n{g:TODAY’S BEST}\nabout {o:100} logical qubits, on small\ncodes that discard failed runs{n:quera25}{n:helios48}',
  },
  utxoShare: 0.35,
  utxo: {
    cast: '6.0–8.2M',
    castNote: 'BTC behind public keys already on chain{n:glassnode26}{n:p11}, of 20.09 million{n:supply}',
    breakdown: '{g:WHERE THE KEYS SHOW}\nPay to public key: {o:~1.7M}{n:p11}{n:google26}\n   of it, attributed to Satoshi: {o:~1.1M}{n:lerner19}\nReused addresses: {o:4.1–6.2M}{n:glassnode26}{n:p11}\nTaproot outputs: {o:0.20–0.27M}{n:p11feb}{n:p11}\n{m:in red: 30–40% of all coins, by value}',
  },
  script: {
    left: '{r:KEY ON CHAIN}\npay to public key (P2PK)\nany address that has spent\nTaproot (P2TR){n:bip360}',
    right: '{g:ONLY A HASH}\nP2PKH, P2WPKH, P2SH, P2WSH\nnever spent from\nBIP-360’s P2MR, proposed{n:bip360}',
  },
  curve: { note: 'The real curve is about 2²⁵⁶ points over a finite field{n:sec2}. This smooth drawing is its shadow; the water is its axis.' },
  trap: {
    forward: '{g:FORWARD}\nP = k·G: add G to itself k times,\nwith shortcuts. A blink on any phone.',
    back: '{g:BACKWARD}\nfind k from P: the best known classical\nattack takes about 2¹²⁸ steps{n:safecurves}',
    shor: 'Shor’s algorithm turns the cliff into stairs: if the machine exists, and only for a key it can see.',
  },
  key: {
    sub: 'one of about 1.16 × 10⁷⁷{n:sec2}. A seed phrase is the number a wallet’s keys come from, written as words.',
    egg: '{g:FENCED OFF: INTERPRETATION, NOT SECURITY}\nDavid Deutsch, who described the universal quantum computer, argues its power points to many worlds{n:deutsch85}. A debate about what is real. It changes the story, never the math.',
  },
};

// The five targets. Verdict text is HTML; {n:id} marks become source links.
export const TARGETS = [
  {
    key: 'satoshi', label: 'Satoshi era', tag: 'P2PK', cls: 'ex', exposed: true,
    title: 'A 2009 coin paid straight to a public key', note: 'Its public key has been on chain since 2009.',
    app: { net: 'node · 968,751', kicker: 'P2PK · 2009', title: 'Block 1’s reward', big: '50.00000000', unit: 'BTC', rows: [['Paid to', 'a raw public key (P2PK)'], ['Created', 'block 1 · 9 January 2009'], ['Public key', 'on chain since 2009', 'bad'], ['Moved since', 'never']], foot: 'A real output: block 1’s 50 BTC reward, unspent.' },
    script: { kicker: 'Locking script · P2PK', title: 'Spendable by the owner of this key', lines: [['<65-byte public key>', 'bad'], ['0496b538e853519c … 2342c858ee', 'bad'], ['OP_CHECKSIG', '']], note: ['The public key itself is on chain, since 9 January 2009.', 'As it stands, a target for Shor’s algorithm.'] },
    verdict: {
      badge: 'Exposed · can’t be moved', tone: 'bad', title: 'The key has been on chain since 2009.',
      body: '<p>This coin pays to a raw public key{n:block1}, as the earliest block rewards did. Shor’s algorithm turns a visible public key into its private key. Google’s 2026 estimate for a machine that could: under <b>500,000</b> physical qubits, about <b>9–23 minutes</b> a key{n:google26}. No such machine exists.</p><p>About <b>1.7 million BTC</b> sits in outputs like this{n:p11}{n:google26}, around 1.1 million of it attributed to Satoshi{n:lerner19}. If the keys are lost, no one can move these coins to safety.</p><p class="fix">No wallet can fix a lost key. Bitcoin itself would have to choose: leave these coins, slow their spending (Hourglass{n:hourglass}), or phase out old signatures (BIP-361, a draft{n:bip361}).</p>',
    },
  },
  {
    key: 'reused', label: 'Reused', tag: 'P2PKH', cls: 'ex', exposed: true,
    title: 'An address that has already spent once', note: 'An earlier spend put its key on chain.',
    app: { net: 'node · 968,751', kicker: 'P2PKH · reused', title: 'Everyday wallet', big: '0.13370000', unit: 'BTC', rows: [['Address', '1Ex…mple (an example)'], ['Received', '2022'], ['Spent from', 'once, in 2023', 'bad'], ['Public key', 'on chain since that spend', 'bad']], foot: 'An example, not a real address.' },
    script: { kicker: 'Locking script · P2PKH', title: 'A hash, but the key already showed', lines: [['OP_DUP OP_HASH160', ''], ['<20-byte hash of the key>', 'ok'], ['OP_EQUALVERIFY OP_CHECKSIG', ''], ['earlier spend: <signature> <public key>', 'bad']], note: ['The script shows only a hash, but the first spend put the', 'public key on chain. The coins still here are exposed.'] },
    verdict: {
      badge: 'Exposed · can be moved', tone: 'bad', title: 'One spend put its key on chain.',
      body: '<p>An address hides its public key behind a hash until its first spend. This one has spent, so its key is public, and the coins still sitting there are a target{n:chaincode25}.</p><p>Reused addresses hold about <b>4.1–6.2 million BTC</b> in 2026 counts, much of it on exchanges{n:glassnode26}{n:p11}.</p><p class="fix">Send the coins to a fresh address that has never spent. The key hides behind a hash again{n:chaincode25}. Then stop reusing addresses.</p>',
    },
  },
  {
    key: 'taproot', label: 'Taproot', tag: 'P2TR', cls: 'ex', exposed: true,
    title: 'A Taproot output', note: 'The output itself is a public key.',
    app: { net: 'node · 968,751', kicker: 'P2TR · Taproot', title: 'Taproot wallet', big: '0.25000000', unit: 'BTC', rows: [['Address', 'bc1p… (an example)'], ['Received', '2025'], ['Output', 'a tweaked public key', 'bad'], ['Public key', 'on chain since it was paid', 'bad']], foot: 'An example, not a real address.' },
    script: { kicker: 'Locking script · P2TR', title: 'The output is a key', lines: [['OP_1', ''], ['<32-byte tweaked public key>', 'bad']], note: ['A public key sits in the output from the moment it is paid.', 'Whoever solves it can spend by the key path.'] },
    verdict: {
      badge: 'Exposed · can be moved', tone: 'bad', title: 'Taproot shows a public key by design.',
      body: '<p>A Taproot output is a (tweaked) public key, on chain from the moment it is paid{n:chaincode25}{n:bip360}. Anyone who can solve it can spend by the key path.</p><p>Taproot outputs hold about <b>0.20–0.27 million BTC</b>, and the amount is growing{n:p11feb}{n:p11}.</p><p class="fix">Today: move to a hashed type such as native SegWit{n:google26}. Proposed: BIP-360’s P2MR, Taproot’s script tree without the key path. A draft since February 2026, not active{n:bip360}.</p>',
    },
  },
  {
    key: 'fresh', label: 'Fresh', tag: 'P2WPKH', cls: 'hd', exposed: false,
    title: 'A fresh address that has never spent', note: 'Only a hash of its key is on chain.',
    app: { net: 'node · 968,751', kicker: 'P2WPKH · fresh', title: 'Savings', big: '0.61500000', unit: 'BTC', rows: [['Address', 'bc1q… (an example)'], ['Received', '2026'], ['On chain', 'a 20-byte hash only', 'ok'], ['Public key', 'hidden until you spend', 'ok']], foot: 'An example, not a real address.' },
    script: { kicker: 'Locking script · P2WPKH', title: 'Only a hash', lines: [['OP_0', ''], ['<20-byte hash of the key>', 'ok']], note: ['Only a hash. The public key appears when you spend,', 'for about one block.'] },
    verdict: {
      badge: 'Hidden · safe at rest', tone: 'ok', title: 'Nothing to aim at: only a hash is on chain.',
      body: '<p>Shor’s algorithm needs a public key. This output shows only a 20-byte hash of one; the key appears when you spend{n:bip360}.</p><p>That spend opens a window of about one block, 10 minutes on average. Google estimates a future fast machine could need about 9 minutes from a precomputed start: a success chance just under 41%, under ideal conditions{n:google26}. BIP-360’s authors expect early machines to be too slow for this{n:bip360}.</p><p class="fix">Keep using fresh addresses, and don’t share your extended public key (xpub){n:bip360}. For spends after such machines exist, bitcoin needs post-quantum signatures: drafts exist, none has a BIP number yet{n:shrincs}.</p>',
    },
  },
  {
    key: 'proof', label: 'The proof', tag: 'mining', cls: 'pw', exposed: false,
    title: 'The proof of work', note: 'No key to steal: the proof is work.',
    app: { net: 'full node', kicker: 'Chain tip', title: 'The proof of work', big: '968,751', unit: 'blocks', rows: [['Tip hash', '00000000000000000000ccd4…', 'or'], ['Difficulty', '1.33 × 10¹⁴'], ['Hash rate', 'about 9.4 × 10²⁰ a second'], ['Proof', 'valid', 'ok']], foot: 'From mempool.space, 26 September 2026.' },
    script: { kicker: 'Block header · proof of work', title: 'Work, not a key', lines: [['version · previous block · merkle root', ''], ['time · bits · nonce', ''], ['SHA-256(SHA-256(header)) < target', 'or'], ['00000000000000000000ccd4e4e6…', 'or']], note: ['No key to steal. The proof is work, checked by every node.'] },
    verdict: {
      badge: 'Holds · proof of work', tone: 'proof', title: 'They can’t print the proof either.',
      body: '<p>Mining is a search. Grover’s algorithm speeds search up by a square root at most{n:grover96}{n:bbbv97}, and splits badly across machines{n:zalka99}.</p><p>Out-mining the network that way would take about <b>10²³ qubits and 10²⁵ watts</b>{n:kardashev26}, a few percent of the Sun’s whole output{n:sun}. The network runs on about 10–15 GW{n:kardashev26}. Even a fantastically fast quantum miner would manage about 0.25 TH/s; one ordinary mining machine does 110 TH/s{n:google26}.</p><p class="fix">Nothing to fix. Google’s paper calls quantum mining not “something to worry about in the next several decades”{n:google26}.</p>',
    },
  },
];
