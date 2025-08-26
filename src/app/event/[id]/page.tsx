import * as React from "react";
import EventClient from "./EventClient";

type PageProps = {
  // params is now a Promise in Next 15
  params: Promise<{ id: string }>;
};

export default function Page({ params }: PageProps) {
  // unwrap the promise with React.use()
  const { id } = React.use(params);
  return <EventClient id={id} />;
}