const chai = require('chai');
const chaiHttp = require('chai-http');

const SERVER_URL="https://localhost:8083"

chai.should();
chai.use(chaiHttp);
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

describe('Rest api test', ()=>{

    describe('GET /api/itineraries', () => {
        it("Should get all the itineraries in db", (done) =>{
            chai.request(SERVER_URL)
                .get("/api/itineraries/?api_key=4199fb08-e33a-48c0-9f54-43b33f3fec9d&location=&days=&architecture=&cultural=&foods=&hotel=&natural=&religion=")
                .end((err, res) => {
                    res.should.have.status(200);
                    res.text.should.be.an("string");
                done()
                })
        })
    })

    describe('POST /api/itinerary', () => {
        it("Should insert an itinerary in db", (done) =>{
            var data={
                "api_key": "4199fb08-e33a-48c0-9f54-43b33f3fec9d",
                "title": "api_test",
                "data" : [
                    {"plan": [
                        {
                          "id": "R1834818"
                        }
                    ]}]
            }
            chai.request(SERVER_URL)
                .post("/api/itinerary")
                .type('json')
                .send(data)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.text.should.be.eql("Test passed");
                done()
                })
        })
    })

    describe('GET /api/itinerary', () => {
        it("Should get info about the referenced itinerary", (done) =>{
            chai.request(SERVER_URL)
                .get("/api/itinerary/?id=ae3286bf-8814-451d-91f1-62b495a7158a&api_key=4199fb08-e33a-48c0-9f54-43b33f3fec9d")
                .end((err, res) => {
                    res.should.have.status(200);
                    res.text.should.be.an("string");
                done()
                })
        })
    })
})


describe('web server test', ()=>{
    describe('GET /planner', () => {
        it("Should get planner page", (done) =>{
            chai.request(SERVER_URL)
                .get("/planner")
                .end((err, res) => {
                    res.should.have.status(200)
                    res.type.should.be.eql('text/html')
                done()
                })
        })
    })

    describe('GET /search', () => {
        it("Should get place info", (done) =>{
            chai.request(SERVER_URL)
                .get("/search?name=rome")
                .end((err, res) => {
                    res.should.have.status(200)
                    res.type.should.be.eql('application/json')
                done()
                })
        })
    })

    describe('POST /wather', () => {
        it("Should get meteo info", (done) =>{
            let data={
                info:'{"lat":41.890262603759766,"lon":12.493086814880371}'
            }
            chai.request(SERVER_URL)
                .post("/weather")
                .type('json')
                .send(data)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.type.should.be.eql('application/json')
                done()
                })
        })
    })

    describe('POST /poinfo', () => {
        it("Should get poi's info", (done) =>{
            let data={
                info:'{"name":"Colosseum","id":11609541}'
            }
            chai.request(SERVER_URL)
                .post("/poinfo")
                .type('json')
                .send(data)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.type.should.be.eql('text/html')
                done()
                })
        })
    })
})
