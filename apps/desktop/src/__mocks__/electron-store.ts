export default class Store {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private data: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get = jest.fn((key: string, defaultVal?: any) => this.data[key] ?? defaultVal);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set = jest.fn((key: string, val: any) => {
    this.data[key] = val;
  });
  delete = jest.fn((key: string) => {
    delete this.data[key];
  });
  clear = jest.fn(() => {
    this.data = {};
  });
  has = jest.fn((key: string) => key in this.data);
  store = {};
}
