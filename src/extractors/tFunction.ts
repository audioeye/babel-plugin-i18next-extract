import * as BabelCore from "@babel/core";
import * as BabelTypes from "@babel/types";

import {
  COMMENT_HINTS_KEYWORDS,
  getCommentHintForPath,
  CommentHint,
} from "../comments";
import { Config } from "../config";
import { ExtractedKey } from "../keys";

import {
  ExtractionError,
  getFirstOrNull,
  evaluateIfConfident,
  findKeyInObjectExpression,
  parseI18NextOptionsFromCommentHints,
  iterateObjectExpression,
} from "./commons";

/**
 * Check whether a given CallExpression path is a global call to the `t`
 * function.
 *
 * @param path: node path to check
 * @param config: plugin configuration
 * @returns true if the given call expression is indeed a call to i18next.t.
 */
function isSimpleTCall(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
): boolean {
  const callee = path.get("callee");

  if (!callee.isIdentifier()) return false;

  return config.tFunctionNames.includes(callee.node.name);
}

/**
 * Parse options of a `t(…)` call.
 * @param path: NodePath representing the second argument of the `t()` call
 *   (i.e. the i18next options)
 * @returns an object indicating whether the parsed options have context
 *   and/or count.
 */
function parseTCallOptions(
  path: BabelCore.NodePath | undefined,
): ExtractedKey["parsedOptions"] {
  const res: ExtractedKey["parsedOptions"] = {
    contexts: false,
    hasCount: false,
    ordinal: false,
    ns: null,
    keyPrefix: null,
    defaultValue: null,
    defaultValues: [],
  };

  if (!path) return res;

  // Try brutal evaluation of defaultValue first.
  const optsEvaluation = evaluateIfConfident(path);
  if (typeof optsEvaluation === "string") {
    res.defaultValue = optsEvaluation;
  } else if (path.isObjectExpression()) {
    // It didn't work. Let's try to parse as object expression.
    res.contexts = findKeyInObjectExpression(path, "context") !== null;
    res.hasCount = findKeyInObjectExpression(path, "count") !== null;

    const nsNode = findKeyInObjectExpression(path, "ns");
    if (nsNode !== null && nsNode.isObjectProperty()) {
      const nsValueNode = nsNode.get("value");
      const nsEvaluation = evaluateIfConfident(nsValueNode);
      res.ns = getFirstOrNull(nsEvaluation);
    }

    const defaultValueNode = findKeyInObjectExpression(path, "defaultValue");
    if (defaultValueNode !== null && defaultValueNode.isObjectProperty()) {
      const defaultValueNodeValue = defaultValueNode.get("value");
      res.defaultValue = evaluateIfConfident(defaultValueNodeValue);
    }

    const keyPrefixNode = findKeyInObjectExpression(path, "keyPrefix");
    if (keyPrefixNode !== null && keyPrefixNode.isObjectProperty()) {
      const keyPrefixNodeValue = keyPrefixNode.get("value");
      res.keyPrefix = evaluateIfConfident(keyPrefixNodeValue);
    }

    const ordinalNode = findKeyInObjectExpression(path, "ordinal");
    if (ordinalNode != null && ordinalNode.isObjectProperty()) {
      res.ordinal = evaluateIfConfident(ordinalNode.get("value"));
    }

    // Support defaultValue_someKey
    res.defaultValues = Array.from(iterateObjectExpression(path)).reduce(
      (accumulator, [key, node]) => {
        if (!key.startsWith("defaultValue_") || !node.isObjectProperty()) {
          return accumulator;
        }
        return [
          ...accumulator,
          [
            key.replace("defaultValue", "").replace("_ordinal", ""),
            evaluateIfConfident(node.get("value")),
          ],
        ];
      },
      [] as [string, string][],
    );
  }

  return res;
}

/**
 * Given a call to the `t()` function, find the key and the options.
 *
 * @param path NodePath of the `t()` call.
 * @param commentHints parsed comment hints
 * @throws ExtractionError when the extraction failed for the `t` call.
 */
function extractTCall(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  commentHints: CommentHint[],
): ExtractedKey {
  const args = path.get("arguments");
  const keyEvaluation = evaluateIfConfident(args[0]);

  if (typeof keyEvaluation !== "string") {
    throw new ExtractionError(
      `Couldn't evaluate i18next key. You should either make the key ` +
        `evaluable or skip the line using a skip comment (/* ` +
        `${COMMENT_HINTS_KEYWORDS.DISABLE.LINE} */ or /* ` +
        `${COMMENT_HINTS_KEYWORDS.DISABLE.NEXT_LINE} */).`,
      path,
    );
  }

  const tSecondParamValue = evaluateIfConfident(args[1]);

  let parsedTCallOptions;
  if (typeof tSecondParamValue === "string") {
    parsedTCallOptions = parseTCallOptions(args[2]);
    parsedTCallOptions.defaultValue = tSecondParamValue;
  } else {
    parsedTCallOptions = parseTCallOptions(args[1]);
  }

  return {
    key: keyEvaluation,
    parsedOptions: {
      ...parsedTCallOptions,
      ...parseI18NextOptionsFromCommentHints(path, commentHints),
    },
    sourceNodes: [path.node],
    extractorName: extractTFunction.name,
  };
}

/**
 * Parse a call expression (likely a call to a `t` function) to find its
 * translation keys and i18next options.
 *
 * @param path: node path of the t function call.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 * @param skipCheck: set to true if you know that the call expression arguments
 *   already is a `t` function.
 */
export default function extractTFunction(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
  skipCheck = false,
): ExtractedKey[] {
  if (getCommentHintForPath(path, "DISABLE", commentHints)) return [];
  if (!skipCheck && !isSimpleTCall(path, config)) return [];
  return [extractTCall(path, commentHints)];
}
