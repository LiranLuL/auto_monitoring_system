const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();

const mockClient = {
  query: mockQuery,
  release: mockRelease
};

const Pool = jest.fn(() => ({
  query: mockQuery,
  connect: jest.fn(() => Promise.resolve(mockClient))
}));

module.exports = { Pool };