export class Asset {
  constructor(public name: string, public mime: string, public size: number, public file: Buffer) {}
}
