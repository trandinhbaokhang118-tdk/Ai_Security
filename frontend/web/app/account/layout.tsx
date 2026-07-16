"use client";
import type {ReactNode} from "react";import {PrewiseShell} from "@/components/PrewiseUI";
export default function AccountLayout({children}:{children:ReactNode}){return <PrewiseShell><main id="main-content" className="account-shell account-preview"><section className="account-content">{children}</section></main></PrewiseShell>}

