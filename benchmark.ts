import { bench, run } from 'mitata';

const externalLabelToName = new Map([
    ['ext1', 'Label 1'],
    ['ext2', 'Label 2'],
    ['ext4', 'Label 4'],
    ['ext6', 'Label 6'],
    ['ext8', 'Label 8'],
]);

const combinedLabels = new Set([
    'ext1', 'ext2', 'ext3', 'ext4', 'ext5', 'ext6', 'ext7', 'ext8', 'ext9', 'ext10'
]);

bench('Original nested Array.from', () => {
    const labels = combinedLabels.size > 0
        ? Array.from(
            new Set(
                Array.from(combinedLabels).map((externalId) => externalLabelToName?.get(externalId) ?? externalId)
            )
        )
        : undefined;
});

bench('Optimized iterator Set', () => {
    let labels: string[] | undefined = undefined;
    if (combinedLabels.size > 0) {
        const finalLabels = new Set<string>();
        for (const externalId of combinedLabels) {
            finalLabels.add(externalLabelToName?.get(externalId) ?? externalId);
        }
        labels = Array.from(finalLabels);
    }
});

run();
