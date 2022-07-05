const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/routes/api');

chai.should();
chai.use(chaiHttp);

describe('Rest api test', ()=>{

    describe('GET /api/test', () => {
        it("Should get test response", (done) =>{
            chai.request(app)
                .get("/api/test")
                .end((err, res) => {
                    res.should.have.status(200)
                    res.text.should.be.eql("test for api");
                done()
                })
        })
    })

    describe('GET /api/itineraries', () => {
        it("Should get itineraries", (done) =>{
            chai.request(app)
                .get("/api/itineraries?")
                .end((err, res) => {
                    console.log(err)
                    res.should.have.status(200)
                    //res.text.type.should.be(json);
                done()
                })
        })
    })
})