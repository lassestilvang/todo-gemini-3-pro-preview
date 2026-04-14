echo "Checking DraggableTaskRow (calendar2)"
grep -A 5 -B 5 "tabIndex={0}" src/components/calendar2/DraggableTaskRow.tsx

echo "Checking DraggableTaskRow (calendar4)"
grep -A 5 -B 5 "tabIndex={0}" src/components/calendar4/DraggableTaskRow.tsx

echo "Checking UploadTab"
grep -A 5 -B 5 "tabIndex={0}" src/components/ui/icon-picker/UploadTab.tsx

echo "Checking SidebarWrapper"
grep -A 5 -B 5 "tabIndex={0}" src/components/layout/SidebarWrapper.tsx

echo "Checking TaskItem"
grep -A 5 -B 5 "tabIndex={0}" src/components/tasks/TaskItem.tsx
