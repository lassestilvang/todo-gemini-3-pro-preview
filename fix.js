import fs from 'fs';
const file = 'src/components/ui/icon-picker/IconsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file has a duplicate <Tooltip> block rendering the clear button, followed by a duplicate grid block rendering the icons.
// We'll just carefully remove the duplicate code.

// Find the first </TooltipContent></Tooltip>))}
const splitPoint = content.indexOf('</Tooltip>\n                        ))}');
if (splitPoint === -1) {
  console.log("Could not find split point");
  process.exit(1);
}
const indexToStartRemoving = splitPoint + '</Tooltip>\n                        ))}'.length;

// Find the next </div> that closes the grid
const gridClose = content.indexOf('</div>', indexToStartRemoving);

// Find the end of the duplicate block, which is right before the </div> that closes the outer container,
// which is just before </TooltipProvider>
const endPoint = content.indexOf('</div>\n            </TooltipProvider>');

if (gridClose === -1 || endPoint === -1) {
    console.log("Could not find end point");
    process.exit(1);
}

// We just want to remove everything from indexToStartRemoving up to endPoint, and replace it with just "\n                    </div>\n                </div>\n"
content = content.substring(0, indexToStartRemoving) + '\n                    </div>\n                </div>\n' + content.substring(endPoint);

fs.writeFileSync(file, content);
console.log("Fixed!");
