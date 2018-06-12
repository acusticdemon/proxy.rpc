const ProxyRpc = require('../index');

require('chai').should();

describe('proxy.rpc', async () => {

  const port = 9900;

  before(async () => {
    let ctl = {
      a() {

      },
      b: {
        c(x, y) {
          return x + y
        }
      },
      d: {
        e: {
          f({x, y}) {
            return x * y
          }
        }
      }
    };

    ProxyRpc.run(ctl, {
      port
    });

    this.client = ProxyRpc.at(`localhost:${port}`);
  });

  it('direct fn', async () => {
    let a = await this.client.a()
    a.should.be.equal('ok')
  })

  it('short path', async () => {
    let c = await this.client.b.c(1, 2)
    c.should.be.equal(3)
  })

  it('long path', async () => {
    let f = await this.client.d.e.f({x: 1, y: 2})
    f.should.be.equal(2)
  })
})