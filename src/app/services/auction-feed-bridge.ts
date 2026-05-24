/* TM_AUCTION_FEED_BRIDGE_V1 */
import { Auction, AuctionSocialFeedCard, AuctionService } from './auction.service';

export type AuctionFeedBridgeSource = 'snapshot' | 'single';

export interface AuctionFeedBridgePayload {
  source: AuctionFeedBridgeSource;
  generatedAt: string;
  items: AuctionSocialFeedCard[];
}

export function createAuctionFeedBridgePayload(
  auctionService: AuctionService,
  source: AuctionFeedBridgeSource = 'snapshot',
): AuctionFeedBridgePayload {
  return {
    source,
    generatedAt: new Date().toISOString(),
    items: auctionService.getSocialFeedSnapshot(),
  };
}

export function createSingleAuctionFeedBridgePayload(
  auctionService: AuctionService,
  auction: Auction,
): AuctionFeedBridgePayload {
  return {
    source: 'single',
    generatedAt: new Date().toISOString(),
    items: [auctionService.toSocialFeedCard(auction)],
  };
}
/* /TM_AUCTION_FEED_BRIDGE_V1 */
