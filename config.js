exports.basePort=8080;
exports.dbPort=8081;

exports.testPort=8090;
exports.testBase="##.test.dev.matthewfl.com:8090"; // "##.localhost:8090"
exports.testHost="node_test_host_id";
exports.testSKey="sampleKey"; // https://www.random.org/passwords/?num=1&len=24&format=plain&rnd=new
exports.testTimeToLive=5*60*1000; // in ms
exports.testDoNotOverwrite=true; // should be true in production

exports.errorPage="http://localhost:8080/error";