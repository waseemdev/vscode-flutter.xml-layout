import { Position } from "vscode";


export type FilePath = string;

/**
 * A location (character range) within a file.
 */
export interface Location {
	file: FilePath;
	offset: number;
	length: number;
	startLine: number;
	startColumn: number;
}
/**
 * A description of a set of edits that implement a single conceptual change.
 */
export interface SourceChange {
	/**
	 * A human-readable description of the change to be applied.
	 */
	message: string;

	/**
	 * A list of the edits used to effect the change, grouped by file.
	 */
	edits: SourceFileEdit[];

	/**
	 * A list of the linked editing groups used to customize the changes that
	 * were made.
	 */
	linkedEditGroups: LinkedEditGroup[];

	/**
	 * The position that should be selected after the edits have been
	 * applied.
	 */
	selection?: Position;

	/**
	 * The optional identifier of the change kind. The identifier remains
	 * stable even if the message changes, or is parameterized.
	 */
	id?: string;
}
export interface SourceFileEdit {
	/**
	 * The file containing the code to be modified.
	 */
	file: FilePath;

	/**
	 * The modification stamp of the file at the moment when the change was
	 * created, in milliseconds since the "Unix epoch". Will be -1 if the
	 * file did not exist and should be created. The client may use this
	 * field to make sure that the file was not changed since then, so it is
	 * safe to apply the change.
	 */
	fileStamp: number;

	/**
	 * A list of the edits used to effect the change.
	 */
	edits: SourceEdit[];
}
export interface SourceEdit {
	/**
	 * The offset of the region to be modified.
	 */
	offset: number;

	/**
	 * The length of the region to be modified.
	 */
	length: number;

	/**
	 * The code that is to replace the specified region in the original code.
	 */
	replacement: string;

	/**
	 * An identifier that uniquely identifies this source edit from other
	 * edits in the same response. This field is omitted unless a containing
	 * structure needs to be able to identify the edit for some reason.
	 * 
	 * For example, some refactoring operations can produce edits that might
	 * not be appropriate (referred to as potential edits). Such edits will
	 * have an id so that they can be referenced. Edits in the same response
	 * that do not need to be referenced will not have an id.
	 */
	id?: string;
}
export interface LinkedEditGroup {
	/**
	 * The positions of the regions that should be edited simultaneously.
	 */
	positions: Position[];

	/**
	 * The length of the regions that should be edited simultaneously.
	 */
	length: number;

	/**
	 * Pre-computed suggestions for what every region might want to be
	 * changed to.
	 */
	suggestions: LinkedEditSuggestion[];
}

/**
 * A suggestion of a value that could be used to replace all of the linked
 * edit regions in a LinkedEditGroup.
 */
export interface LinkedEditSuggestion {
	/**
	 * The value that could be used to replace all of the linked edit
	 * regions.
	 */
	value: string;

	/**
	 * The kind of value being proposed.
	 */
	kind: LinkedEditSuggestionKind;
}

/**
 * An enumeration of the kind of values that can be suggested for a linked
 * edit.
 */
export type LinkedEditSuggestionKind =
	"METHOD"
	| "PARAMETER"
	| "TYPE"
	| "VARIABLE";

    