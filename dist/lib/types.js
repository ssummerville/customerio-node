"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterOperator = exports.IdentifierType = void 0;
/**
 * The three identifier kinds Customer.io accepts for a person.
 *
 * - `Id` — your application's user id
 * - `Email` — the person's email address
 * - `CioId` — Customer.io's internal stable id (prefix with `cio_` when used as a path segment)
 */
var IdentifierType;
(function (IdentifierType) {
    IdentifierType["Id"] = "id";
    IdentifierType["Email"] = "email";
    IdentifierType["CioId"] = "cio_id";
})(IdentifierType || (exports.IdentifierType = IdentifierType = {}));
/** Comparison operators supported in attribute and object conditions. */
var FilterOperator;
(function (FilterOperator) {
    FilterOperator["Eq"] = "eq";
    FilterOperator["Exists"] = "exists";
})(FilterOperator || (exports.FilterOperator = FilterOperator = {}));
