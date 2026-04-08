const externalLabelToName = new Map([
    ['ext1', 'Label 1'],
    ['ext2', 'Label 2'],
]);

const combinedLabels = new Set(['ext1', 'ext2', 'ext3', 'ext1']);

// Original
const labelsOriginal = combinedLabels.size > 0
    ? Array.from(
        new Set(
            Array.from(combinedLabels).map((externalId) => externalLabelToName?.get(externalId) ?? externalId)
        )
    )
    : undefined;
console.log('Original:', labelsOriginal);

// New using Set directly
let labelsNew = undefined;
if (combinedLabels.size > 0) {
    const finalLabels = new Set();
    for (const externalId of combinedLabels) {
        finalLabels.add(externalLabelToName?.get(externalId) ?? externalId);
    }
    labelsNew = Array.from(finalLabels);
}
console.log('New:', labelsNew);
