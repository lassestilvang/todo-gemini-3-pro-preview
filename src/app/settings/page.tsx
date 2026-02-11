import { Metadata } from "next"
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher"
import { DataExportImport } from "@/components/settings/DataExportImport"

export const metadata: Metadata = {
    title: "Settings - Todo Gemini",
    description: "Manage your application settings",
}

import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TimeSettings } from "@/components/settings/TimeSettings"
import { WeekStartSettings } from "@/components/settings/WeekStartSettings"
import { CalendarTooltipSettings } from "@/components/settings/CalendarTooltipSettings"
import { TodoistSettings } from "@/components/settings/TodoistSettings"

export default async function SettingsPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }
    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
                <div className="flex-1 space-y-4">
                    <h1 className="inline-block font-heading text-4xl tracking-tight lg:text-5xl">
                        Settings
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Customize the appearance and behavior of the application.
                    </p>
                </div>
            </div>
            <hr className="my-8" />
            <div className="grid gap-10">
                <section>
                    <h2 className="mb-4 text-2xl font-bold tracking-tight">Appearance</h2>
                    <p className="mb-6 text-muted-foreground">
                        Select a theme that suits your style.
                    </p>
                    <ThemeSwitcher />
                </section>
                <section>
                    <h2 className="mb-4 text-2xl font-bold tracking-tight">Preferences</h2>
                    <p className="mb-6 text-muted-foreground">
                        Configure how dates and times are displayed.
                    </p>
                    <div className="space-y-6">
                        <TimeSettings userId={user.id} initialUse24HourClock={user.use24HourClock} />
                        <WeekStartSettings userId={user.id} initialWeekStartsOnMonday={user.weekStartsOnMonday} />
                        <CalendarTooltipSettings
                            userId={user.id}
                            initialUseNativeTooltipsOnDenseDays={user.calendarUseNativeTooltipsOnDenseDays ?? null}
                            initialDenseTooltipThreshold={user.calendarDenseTooltipThreshold ?? null}
                        />
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-2xl font-bold tracking-tight">Integrations</h2>
                    <p className="mb-6 text-muted-foreground">
                        Connect third-party services to keep your tasks in sync.
                    </p>
                    <TodoistSettings />
                </section>
                <section>
                    <DataExportImport />
                </section>
            </div>
        </div>
    )
}
