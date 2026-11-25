"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specifierSourceMatches = specifierSourceMatches;
const typeDeclaredInFile_1 = require("./typeDeclaredInFile");
const typeDeclaredInLib_1 = require("./typeDeclaredInLib");
const typeDeclaredInPackageDeclarationFile_1 = require("./typeDeclaredInPackageDeclarationFile");
function specifierSourceMatches(specifier, symbol, program) {
    const declarations = symbol?.getDeclarations() ?? [];
    const declarationFiles = declarations.map(declaration => declaration.getSourceFile());
    switch (specifier.from) {
        case 'file':
            return (0, typeDeclaredInFile_1.typeDeclaredInFile)(specifier.path, declarationFiles, program);
        case 'lib':
            return (0, typeDeclaredInLib_1.typeDeclaredInLib)(declarationFiles, program);
        case 'package':
            return (0, typeDeclaredInPackageDeclarationFile_1.typeDeclaredInPackageDeclarationFile)(specifier.package, symbol, declarations, declarationFiles, program);
    }
}
//# sourceMappingURL=specifierSourceMatches.js.map