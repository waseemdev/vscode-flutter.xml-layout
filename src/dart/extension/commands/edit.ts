
import * as as from "../../shared/analysis_server_types";

export function hasOverlappingEdits(change: as.SourceChange) {
	const priorEdits: { [file: string]: as.SourceEdit[] } = {};
	for (const edit of change.edits) {
		if (!priorEdits[edit.file])
			priorEdits[edit.file] = [];
		for (const e of edit.edits) {
			if (priorEdits[edit.file].find((pe) => pe.offset <= e.offset))
				return true;
			priorEdits[edit.file].push(e);
		}
	}
	return false;
}
