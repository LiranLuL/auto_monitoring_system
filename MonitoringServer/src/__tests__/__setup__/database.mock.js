const db = {
    query: jest.fn(),
    getClient: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    })
  };
  
  module.exports = db;