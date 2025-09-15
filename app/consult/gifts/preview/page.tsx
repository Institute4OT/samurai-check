"use client";

import React, { useState } from "react";
import {
  GiftPrintShell,
  PriorityMapSheet,
  ActionPlanSheet,
  CompanyTemplateSheet,
  demoPriority,
  demoAction,
  demoCompanyDelegation,
  demoCompanyMeeting,
} from "@/components/gifts/GiftSheets";
import { Button } from "@/components/ui/button";

export default function GiftsPreviewPage() {
  type Tab = "priority" | "action" | "delegation" | "meeting";
  const [tab, setTab] = useState<Tab>("priority");

  const node =
    tab === "priority" ? (
      <PriorityMapSheet data={demoPriority} />
    ) : tab === "action" ? (
      <ActionPlanSheet data={demoAction} />
    ) : tab === "delegation" ? (
      <CompanyTemplateSheet data={demoCompanyDelegation} />
    ) : (
      <CompanyTemplateSheet data={demoCompanyMeeting} />
    );

  return (
    <GiftPrintShell filename={`gift_${tab}`}>
      <div className="no-print flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant={tab === "priority" ? "default" : "outline"}
          onClick={() => setTab("priority")}
        >
          優先順位マップ
        </Button>
        <Button
          size="sm"
          variant={tab === "action" ? "default" : "outline"}
          onClick={() => setTab("action")}
        >
          90日アクション
        </Button>
        <Button
          size="sm"
          variant={tab === "delegation" ? "default" : "outline"}
          onClick={() => setTab("delegation")}
        >
          任せ方テンプレ
        </Button>
        <Button
          size="sm"
          variant={tab === "meeting" ? "default" : "outline"}
          onClick={() => setTab("meeting")}
        >
          会議テンプレ
        </Button>
      </div>
      {node}
    </GiftPrintShell>
  );
}
