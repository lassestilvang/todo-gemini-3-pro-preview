# Product Guidelines - Todo Gemini

## Communication Tone
The application supports multiple communication styles, selectable by the user in settings:
- **Professional:** Direct and efficient language focused on clarity.
- **Encouraging:** Motivational and friendly, emphasizing growth and gamification.
- **Minimalist:** Sparse text that prioritizes icons and interface interactions.

## Visual Design & UI Principles
- **Design Consistency:** Strict adherence to shadcn/ui (New York style) and Tailwind CSS v4 to ensure a professional and maintainable interface.
- **Dynamic UX:** 
    - **Motion:** Use Framer Motion for smooth transitions and rewarding gamification feedback, with adjustable intensity in settings.
    - **Density:** Provide a toggle between "Standard" and "Compact" layouts to cater to different user preferences for information density.

## Performance & Interaction
- **High-Speed Execution:** Maintain sub-100ms interaction latency for all core features to ensure the app feels "snappy."
- **Optimistic UI:** Implement optimistic updates for all task-related mutations (create, complete, delete) for instantaneous feedback.
- **Keyboard-First:** Every core action—from task creation to navigation—must be fully accessible and efficient via keyboard shortcuts.

## Content & Messaging
- **AI Transparency:** Clearly label all AI-generated suggestions (e.g., due dates, priority shifts) to build user trust.
- **Subtle Gamification:** Ensure XP bars and level indicators are present but non-intrusive when the "Professional" tone or "Compact" density is selected.
- **Action-Oriented:** System messages and notifications should focus on helping the user identify and take the next most important action.

## Accessibility & Localization
- **A11y-First:** Utilize Radix UI primitives to ensure high accessibility standards (WCAG 2.1) are baked into the component architecture.
- **Language:** The primary focus for the initial release is English, ensuring a high quality of copy and messaging.
