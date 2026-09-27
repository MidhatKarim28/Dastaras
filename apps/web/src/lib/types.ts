import type { ApiClient } from "@dastaras/api/client";
import type { InferResponseType } from "hono/client";

type Api = ApiClient["api"];

export type Category = InferResponseType<Api["categories"]["$get"], 200>[number];
export type ListingCard = InferResponseType<Api["listings"]["$get"], 200>["items"][number];
export type ListingDetail = InferResponseType<Api["listings"][":id"]["$get"], 200>;
export type BookingSummary = InferResponseType<Api["bookings"]["$get"], 200>[number];
export type BookingDetail = InferResponseType<Api["bookings"][":id"]["$get"], 200>;
export type Me = InferResponseType<Api["me"]["$get"], 200>;
export type ProviderStats = InferResponseType<Api["me"]["stats"]["$get"], 200>;
export type MyListing = InferResponseType<Api["me"]["listings"]["$get"], 200>[number];
