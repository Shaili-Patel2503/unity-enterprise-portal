import JSZip from "jszip";
const RELATIONSHIP_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export type EmbeddedProductImage = {
  excelRow: number;
  columnIndex: number;
  mediaPath: string;
  fileName: string;
  url: string;
  source: "rich-data" | "cell-images" | "drawing";
};
export type WorkbookImageScan = {
  images: EmbeddedProductImage[];
  embeddedMediaCount: number;
  warnings: string[];
};
type ImagePointer = {
  excelRow: number;
  columnIndex: number;
  mediaPath: string;
  source: "rich-data" | "cell-images" | "drawing";
};
type XmlFile = {
  path: string;
  document: Document;
};
type CellAddress = {
  row: number;
  columnIndex: number;
};
function elementsByLocalName(
  root: Document | Element,
  localName: string
): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", localName));
}
function directElements(
  root: Element,
  localName: string
): Element[] {
  return Array.from(root.children).filter(
    (element) => element.localName === localName
  );
}
function findZipPath(
  zip: JSZip,
  pattern: RegExp
): string | undefined {
  return Object.keys(zip.files).find(
    (name) => !zip.files[name].dir && pattern.test(name)
  );
}
function resolvePartTarget(sourcePath: string, target: string): string {
  if (target.startsWith("/")) {
    return target.slice(1).replace(/\\/g, "/");
  }
  const parts = sourcePath.replace(/\\/g, "/").split("/");
  parts.pop();
  for (const piece of target.replace(/\\/g, "/").split("/")) {
    if (!piece || piece === ".") continue;
    if (piece === "..") {
      parts.pop();
    } else {
      parts.push(piece);
    }
  }
  return parts.join("/");
}
function relationshipPartPath(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  const folder = normalized.substring(0, lastSlash);
  const fileName = normalized.substring(lastSlash + 1);
  return `${folder}/_rels/${fileName}.rels`;
}
async function readXml(
  zip: JSZip,
  requestedPath: string
): Promise<XmlFile | null> {
  const actualPath = Object.keys(zip.files).find(
    (name) =>
      !zip.files[name].dir &&
      name.toLowerCase() === requestedPath.toLowerCase()
  );
  if (!actualPath) return null;
  const file = zip.file(actualPath);
  if (!file) return null;
  const xml = await file.async("string");
  const document = new DOMParser().parseFromString(
    xml,
    "application/xml"
  );
  if (
    document.getElementsByTagName("parsererror").length > 0
  ) {
    throw new Error(`Invalid XML inside the Excel file: ${actualPath}`);
  }
  return { path: actualPath, document };
}
function relationshipId(
  element: Element,
  localName = "id"
): string | null {
  return (
    element.getAttributeNS(RELATIONSHIP_NS, localName) ||
    element.getAttribute(`r:${localName}`) ||
    element.getAttribute(localName)
  );
}
function relationshipTarget(
  relationshipsDocument: Document,
  id: string
): string | null {
  const relation = elementsByLocalName(
    relationshipsDocument,
    "Relationship"
  ).find((element) => element.getAttribute("Id") === id);
  return relation?.getAttribute("Target") || null;
}
function parseCellAddress(address: string | null): CellAddress | null {
  if (!address) return null;
  const match = address.match(/^\$?([A-Z]+)\$?(\d+)$/i);
  if (!match) return null;
  let columnNumber = 0;
  for (const character of match[1].toUpperCase()) {
    columnNumber =
      columnNumber * 26 + character.charCodeAt(0) - 64;
  }
  const row = Number(match[2]);
  if (!Number.isInteger(row) || row < 1 || columnNumber < 1) {
    return null;
  }
  return {
    row,
    columnIndex: columnNumber - 1,
  };
}
async function findWorksheetPath(
  zip: JSZip,
  sheetName: string
): Promise<string> {
  const workbook = await readXml(zip, "xl/workbook.xml");
  const workbookRels = await readXml(
    zip,
    "xl/_rels/workbook.xml.rels"
  );
  if (workbook && workbookRels) {
    const sheet = elementsByLocalName(
      workbook.document,
      "sheet"
    ).find((element) => element.getAttribute("name") === sheetName);
    if (sheet) {
      const id = relationshipId(sheet);
      if (id) {
        const target = relationshipTarget(
          workbookRels.document,
          id
        );
        if (target) {
          return resolvePartTarget("xl/workbook.xml", target);
        }
      }
    }
  }
  const firstSheet = findZipPath(
    zip,
    /^xl\/worksheets\/sheet\d+\.xml$/i
  );
  if (firstSheet) return firstSheet;
  throw new Error(
    `Could not locate the "${sheetName}" worksheet inside the workbook.`
  );
}
async function collectDrawingPointers(
  zip: JSZip,
  sheetPath: string,
  sheetDocument: Document
): Promise<ImagePointer[]> {
  const pointers: ImagePointer[] = [];
  const sheetRels = await readXml(
    zip,
    relationshipPartPath(sheetPath)
  );
  if (!sheetRels) return pointers;
  const drawingNodes = elementsByLocalName(
    sheetDocument,
    "drawing"
  );
  for (const drawingNode of drawingNodes) {
    const drawingId = relationshipId(drawingNode);
    if (!drawingId) continue;
    const drawingTarget = relationshipTarget(
      sheetRels.document,
      drawingId
    );
    if (!drawingTarget) continue;
    const drawingPath = resolvePartTarget(
      sheetPath,
      drawingTarget
    );
    const drawing = await readXml(zip, drawingPath);
    if (!drawing) continue;
    const drawingRels = await readXml(
      zip,
      relationshipPartPath(drawing.path)
    );
    if (!drawingRels) continue;
    const anchors = [
      ...elementsByLocalName(
        drawing.document,
        "twoCellAnchor"
      ),
      ...elementsByLocalName(
        drawing.document,
        "oneCellAnchor"
      ),
    ];
    for (const anchor of anchors) {
      const from = elementsByLocalName(anchor, "from")[0];
      const picture = elementsByLocalName(anchor, "pic")[0];
      if (!from || !picture) continue;
      const rowValue =
        directElements(from, "row")[0]?.textContent || "";
      const columnValue =
        directElements(from, "col")[0]?.textContent || "";
      const zeroBasedRow = Number(rowValue);
      const zeroBasedColumn = Number(columnValue);
      if (
        !Number.isFinite(zeroBasedRow) ||
        !Number.isFinite(zeroBasedColumn) ||
        zeroBasedRow < 0 ||
        zeroBasedColumn < 0
      ) {
        continue;
      }
      const blip = elementsByLocalName(picture, "blip")[0];
      if (!blip) continue;
      const imageRelationId = relationshipId(blip, "embed");
      if (!imageRelationId) continue;
      const target = relationshipTarget(
        drawingRels.document,
        imageRelationId
      );
      if (!target) continue;
      pointers.push({
        excelRow: zeroBasedRow + 1,
        columnIndex: zeroBasedColumn,
        mediaPath: resolvePartTarget(drawing.path, target),
        source: "drawing",
      });
    }
  }
  return pointers;
}
async function collectCellImageStorePointers(
  zip: JSZip,
  sheetDocument: Document
): Promise<ImagePointer[]> {
  const pointers: ImagePointer[] = [];
  const cellImagesPath = findZipPath(
    zip,
    /^xl\/cellimages\.xml$/i
  );
  if (!cellImagesPath) return pointers;
  const cellImages = await readXml(zip, cellImagesPath);
  if (!cellImages) return pointers;
  const cellImageRels = await readXml(
    zip,
    relationshipPartPath(cellImages.path)
  );
  if (!cellImageRels) return pointers;
  const imageIdToPath = new Map<string, string>();
  for (const picture of elementsByLocalName(
    cellImages.document,
    "pic"
  )) {
    const properties = elementsByLocalName(
      picture,
      "cNvPr"
    )[0];
    const blip = elementsByLocalName(picture, "blip")[0];
    if (!properties || !blip) continue;
    const ids = new Set<string>();
    for (const source of [
      properties.getAttribute("name") || "",
      properties.getAttribute("descr") || "",
    ]) {
      const matches = source.match(/ID_[A-Za-z0-9_-]+/g) || [];
      matches.forEach((id) => ids.add(id));
    }
    const embedId = relationshipId(blip, "embed");
    if (!embedId || ids.size === 0) continue;
    const target = relationshipTarget(
      cellImageRels.document,
      embedId
    );
    if (!target) continue;
    const mediaPath = resolvePartTarget(
      cellImages.path,
      target
    );
    for (const id of ids) {
      imageIdToPath.set(id, mediaPath);
    }
  }
  if (imageIdToPath.size === 0) return pointers;
  const sharedStringsPath = findZipPath(
    zip,
    /^xl\/sharedStrings\.xml$/i
  );
  let sharedStrings: string[] = [];
  if (sharedStringsPath) {
    const sharedDoc = await readXml(zip, sharedStringsPath);
    if (sharedDoc) {
      sharedStrings = elementsByLocalName(
        sharedDoc.document,
        "si"
      ).map((item) =>
        elementsByLocalName(item, "t")
          .map((element) => element.textContent || "")
          .join("")
      );
    }
  }
  for (const cell of elementsByLocalName(sheetDocument, "c")) {
    const address = parseCellAddress(cell.getAttribute("r"));
    if (!address) continue;
    let searchableContent = cell.outerHTML;
    if (cell.getAttribute("t") === "s") {
      const sharedIndex = Number(
        directElements(cell, "v")[0]?.textContent || ""
      );
      if (
        Number.isInteger(sharedIndex) &&
        sharedIndex >= 0 &&
        sharedStrings[sharedIndex]
      ) {
        searchableContent += sharedStrings[sharedIndex];
      }
    }
    const ids =
      searchableContent.match(/ID_[A-Za-z0-9_-]+/g) || [];
    for (const id of new Set(ids)) {
      const mediaPath = imageIdToPath.get(id);
      if (!mediaPath) continue;
      pointers.push({
        excelRow: address.row,
        columnIndex: address.columnIndex,
        mediaPath,
        source: "cell-images",
      });
    }
  }
  return pointers;
}
function getRichValueIndexForCell(
  vmValue: string,
  metadataDocument: Document
): number | null {
  const metadataTypes = elementsByLocalName(
    metadataDocument,
    "metadataType"
  );
  const valueMetadata = elementsByLocalName(
    metadataDocument,
    "valueMetadata"
  )[0];
  const richFutureMetadata = elementsByLocalName(
    metadataDocument,
    "futureMetadata"
  ).find((element) =>
    (element.getAttribute("name") || "")
      .toUpperCase()
      .includes("XLRICHVALUE")
  );
  if (!valueMetadata || !richFutureMetadata) return null;
  const valueBlocks = directElements(valueMetadata, "bk");
  const futureBlocks = directElements(
    richFutureMetadata,
    "bk"
  );
  const vm = Number(vmValue);
  if (!Number.isInteger(vm) || vm < 0) return null;
  const valueIndices =
    vm === 0 ? [0, 1] : [vm - 1, vm];
  for (const valueIndex of [...new Set(valueIndices)]) {
    const valueBlock = valueBlocks[valueIndex];
    if (!valueBlock) continue;
    const records = directElements(valueBlock, "rc");
    for (const record of records) {
      const typeValue = Number(record.getAttribute("t"));
      const isRichValue = [typeValue - 1, typeValue].some(
        (index) =>
          metadataTypes[index]?.getAttribute("name")
            ?.toUpperCase() === "XLRICHVALUE"
      );
      if (!isRichValue) continue;
      const futureIndex = Number(record.getAttribute("v"));
      if (!Number.isInteger(futureIndex) || futureIndex < 0) {
        continue;
      }
      const futureIndices = [
        futureIndex,
        futureIndex + 1,
        futureIndex - 1,
      ];
      for (const index of [...new Set(futureIndices)]) {
        const futureBlock = futureBlocks[index];
        if (!futureBlock) continue;
        const binding = elementsByLocalName(
          futureBlock,
          "rvb"
        )[0];
        if (!binding) continue;
        const richValueIndex = Number(binding.getAttribute("i"));
        if (
          Number.isInteger(richValueIndex) &&
          richValueIndex >= 0
        ) {
          return richValueIndex;
        }
      }
    }
  }
  return null;
}
async function collectRichDataPointers(
  zip: JSZip,
  sheetDocument: Document
): Promise<ImagePointer[]> {
  const pointers: ImagePointer[] = [];
  const metadataPath = findZipPath(
    zip,
    /^xl\/metadata\.xml$/i
  );
  if (!metadataPath) return pointers;
  const metadataFile = await readXml(zip, metadataPath);
  if (!metadataFile) return pointers;
  const richValuePath = findZipPath(
    zip,
    /^xl\/richdata\/(?:rd)?richvalue\.xml$/i
  );
  const richStructurePath = findZipPath(
    zip,
    /^xl\/richdata\/(?:rd)?richvaluestructure\.xml$/i
  );
  const richRelationshipPath = findZipPath(
    zip,
    /^xl\/richdata\/.*richvaluerel\.xml$/i
  );
  if (
    !richValuePath ||
    !richStructurePath ||
    !richRelationshipPath
  ) {
    return pointers;
  }
  const richValues = await readXml(zip, richValuePath);
  const richStructures = await readXml(zip, richStructurePath);
  const richRelationships = await readXml(
    zip,
    richRelationshipPath
  );
  const richRelationshipRels = await readXml(
    zip,
    relationshipPartPath(richRelationshipPath)
  );
  if (
    !richValues ||
    !richStructures ||
    !richRelationships ||
    !richRelationshipRels
  ) {
    return pointers;
  }
  const valueRecords = elementsByLocalName(
    richValues.document,
    "rv"
  );
  const structures = elementsByLocalName(
    richStructures.document,
    "s"
  );
  const relationshipSlots = elementsByLocalName(
    richRelationships.document,
    "rel"
  );
  for (const cell of elementsByLocalName(sheetDocument, "c")) {
    const vm = cell.getAttribute("vm");
    const address = parseCellAddress(cell.getAttribute("r"));
    if (vm === null || !address) continue;
    const richIndex = getRichValueIndexForCell(
      vm,
      metadataFile.document
    );
    if (richIndex === null) continue;
    const richRecord = valueRecords[richIndex];
    if (!richRecord) continue;
    const structureIndex = Number(
      richRecord.getAttribute("s")
    );
    const structure = structures[structureIndex];
    if (!structure) continue;
    const structureType = (
      structure.getAttribute("t") || ""
    ).toLowerCase();
    if (!structureType.includes("localimage")) continue;
    const keys = directElements(structure, "k");
    const imageKeyIndex = keys.findIndex((key) =>
      (key.getAttribute("n") || "")
        .toLowerCase()
        .includes("localimageidentifier")
    );
    if (imageKeyIndex < 0) continue;
    const values = directElements(richRecord, "v");
    const slot = Number(
      values[imageKeyIndex]?.textContent || ""
    );
    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      !relationshipSlots[slot]
    ) {
      continue;
    }
    const relationId = relationshipId(
      relationshipSlots[slot]
    );
    if (!relationId) continue;
    const target = relationshipTarget(
      richRelationshipRels.document,
      relationId
    );
    if (!target) continue;
    pointers.push({
      excelRow: address.row,
      columnIndex: address.columnIndex,
      mediaPath: resolvePartTarget(
        richRelationshipPath,
        target
      ),
      source: "rich-data",
    });
  }
  return pointers;
}
export async function extractEmbeddedProductImages(
  file: File,
  registerObjectUrl: (url: string) => void
): Promise<WorkbookImageScan> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const mediaFiles = Object.keys(zip.files).filter(
    (name) =>
      name.toLowerCase().startsWith("xl/media/") &&
      !zip.files[name].dir
  );
  const embeddedMediaCount = mediaFiles.length;
  const warnings: string[] = [];
  const sheetPath = await findWorksheetPath(zip, "Products");
  const sheetFile = await readXml(zip, sheetPath);
  if (!sheetFile) {
    throw new Error(
      'The "Products" worksheet could not be read from this workbook.'
    );
  }
  let pointers: ImagePointer[] = [];
  const readers = [
    {
      name: "Excel in-cell rich data",
      read: () =>
        collectRichDataPointers(zip, sheetFile.document),
    },
    {
      name: "Excel cell image store",
      read: () =>
        collectCellImageStorePointers(zip, sheetFile.document),
    },
    {
      name: "Worksheet drawing images",
      read: () =>
        collectDrawingPointers(
          zip,
          sheetFile.path,
          sheetFile.document
        ),
    },
  ];
  for (const reader of readers) {
    try {
      pointers.push(...(await reader.read()));
    } catch (error) {
      warnings.push(
        `${reader.name} could not be fully read: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
  const uniquePointers = new Map<string, ImagePointer>();
  for (const pointer of pointers) {
    const key = [
      pointer.excelRow,
      pointer.columnIndex,
      pointer.mediaPath.toLowerCase(),
    ].join("|");
    if (!uniquePointers.has(key)) {
      uniquePointers.set(key, pointer);
    }
  }
  const images: EmbeddedProductImage[] = [];
  for (const pointer of uniquePointers.values()) {
    const actualMediaPath = Object.keys(zip.files).find(
      (name) =>
        !zip.files[name].dir &&
        name.toLowerCase() === pointer.mediaPath.toLowerCase()
    );
    if (!actualMediaPath) {
      warnings.push(
        `An embedded image reference could not be resolved: ${pointer.mediaPath}`
      );
      continue;
    }
    const media = zip.file(actualMediaPath);
    if (!media) continue;
    const blob = await media.async("blob");
    const url = URL.createObjectURL(blob);
    registerObjectUrl(url);
    images.push({
      excelRow: pointer.excelRow,
      columnIndex: pointer.columnIndex,
      mediaPath: actualMediaPath,
      fileName: actualMediaPath.split("/").pop() || "product-image",
      url,
      source: pointer.source,
    });
  }
  return {
    images,
    embeddedMediaCount,
    warnings,
  };
}