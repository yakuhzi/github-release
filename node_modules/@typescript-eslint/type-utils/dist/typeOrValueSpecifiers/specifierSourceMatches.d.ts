import type * as ts from 'typescript';
import type { FileSpecifier, LibSpecifier, PackageSpecifier } from '../TypeOrValueSpecifier';
export declare function specifierSourceMatches(specifier: FileSpecifier | LibSpecifier | PackageSpecifier, symbol: ts.Symbol | undefined, program: ts.Program): boolean;
