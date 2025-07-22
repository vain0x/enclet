export class ManifestFile {
  data: ManifestDocument

  constructor(data?: ManifestDocument) {
    this.data = data ?? { entries: [] }
  }

  static parse(s: string) {
    return new ManifestFile(JSON.parse(s))
  }

  stringify() {
    return JSON.stringify(this.data)
  }

  get entries() {
    return this.data.entries
  }

  includes(relativePath: string) {
    return this.data.entries.find(e => e.relativePath === relativePath)
  }

  addEntry(entry: ManifestEntry) {
    this.data.entries.push(entry)
  }
}

export interface ManifestDocument {
  entries: ManifestEntry[]
}

export interface ManifestEntry {
  relativePath: string
  checksum: string
  hashedFilename: string
}
