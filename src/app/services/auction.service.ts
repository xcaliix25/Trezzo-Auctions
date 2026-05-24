import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';

export type AuctionStatus = 'DRAFT' | 'ACTIVE' | 'ENDING_SOON' | 'ENDED' | 'SOLD' | 'CANCELLED';

export interface AuctionBid {
  id: string;
  user: string;
  amount: number;
  createdAt: Date;
  isWinning: boolean;
}

export interface AuctionSeller {
  id: string;
  name: string;
  rating: number;
  location: string;
  verified: boolean;
}

export interface Auction {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  imageUrl: string;
  gallery: string[];
  seller: AuctionSeller;
  startingPrice: number;
  currentBid: number;
  minIncrement: number;
  buyNowPrice: number | null;
  reservePrice: number | null;
  currency: 'CZK';
  watchers: number;
  views: number;
  bidsCount: number;
  bidHistory: AuctionBid[];
  startsAt: Date;
  endTime: Date;
  status: AuctionStatus;
  condition: 'NEW' | 'LIKE_NEW' | 'USED' | 'DAMAGED';
  shipping: string[];
  payment: string[];
}

export interface PlaceBidResult {
  ok: boolean;
  code: 'OK' | 'AUCTION_ENDED' | 'LOW_BID' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'NETWORK_ERROR';
  message: string;
  auction?: Auction;
}

export interface CreateAuctionInput {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  imageUrl: string;
  gallery?: string[];
  startingPrice: number;
  minIncrement: number;
  buyNowPrice: number | null;
  reservePrice: number | null;
  durationMinutes: number;
  condition: Auction['condition'];
  sellerName: string;
  location: string;
  shipping?: string[];
  payment?: string[];
  status?: 'ACTIVE' | 'DRAFT';
  legalAccepted?: boolean;
}

/* TM_AUCTION_SOCIAL_FEED_DTO_V1 */
export interface AuctionSocialFeedCard {
  type: 'auction';
  source: 'trezzo-auctions';
  id: string;
  auctionId: string;
  title: string;
  subtitle: string;
  text: string;
  imageUrl: string;
  category: string;
  sellerName: string;
  sellerLocation: string;
  currentBid: number;
  currentBidLabel: string;
  buyNowPrice: number | null;
  buyNowPriceLabel: string | null;
  bidsCount: number;
  watchers: number;
  endsAt: string;
  status: AuctionStatus;
  href: string;
  ctaLabel: string;
}
/* /TM_AUCTION_SOCIAL_FEED_DTO_V1 */

type ApiAuction = any;

function asDate(value: any): Date {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function normalizeBid(raw: any): AuctionBid {
  return {
    id: String(raw?._id || raw?.id || `bid_${Date.now()}`),
    user: String(raw?.userName || raw?.user || raw?.userEmail || 'Trezzo uživatel'),
    amount: Number(raw?.amount || 0),
    createdAt: asDate(raw?.createdAt),
    isWinning: !!raw?.isWinning,
  };
}

function normalizeAuction(raw: ApiAuction): Auction {
  return {
    id: String(raw?.id || raw?._id || ''),
    slug: String(raw?.slug || ''),
    title: String(raw?.title || 'Aukce bez názvu'),
    subtitle: String(raw?.subtitle || ''),
    description: String(raw?.description || ''),
    category: String(raw?.category || 'Aukce'),
    imageUrl:
      String(raw?.imageUrl || '').trim() ||
      'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
    gallery: Array.isArray(raw?.gallery) ? raw.gallery.map(String) : [],
    seller: {
      id: String(raw?.sellerUserId || raw?.seller?.id || ''),
      name: String(raw?.sellerName || raw?.seller?.name || 'Trezzo prodejce'),
      rating: Number(raw?.seller?.rating || 100),
      location: String(raw?.sellerLocation || raw?.seller?.location || 'Česká republika'),
      verified: raw?.seller?.verified == null ? true : !!raw.seller.verified,
    },
    startingPrice: Number(raw?.startingPrice || 1),
    currentBid: Number(raw?.currentBid || raw?.startingPrice || 1),
    minIncrement: Number(raw?.minIncrement || 100),
    buyNowPrice: raw?.buyNowPrice == null ? null : Number(raw.buyNowPrice),
    reservePrice: raw?.reservePrice == null ? null : Number(raw.reservePrice),
    currency: 'CZK',
    watchers: Number(raw?.watchers || 0),
    views: Number(raw?.views || 0),
    bidsCount: Number(raw?.bidsCount || raw?.bidHistory?.length || 0),
    bidHistory: Array.isArray(raw?.bidHistory) ? raw.bidHistory.map(normalizeBid) : [],
    startsAt: asDate(raw?.startsAt),
    endTime: asDate(raw?.endsAt || raw?.endTime),
    status: String(raw?.status || 'ACTIVE') as AuctionStatus,
    condition: String(raw?.condition || 'USED') as Auction['condition'],
    shipping: Array.isArray(raw?.shipping) ? raw.shipping.map(String) : [],
    payment: Array.isArray(raw?.payment) ? raw.payment.map(String) : [],
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuctionService {
  private readonly apiBase = '/api/auctions';
  private readonly auctionsSubject = new BehaviorSubject<Auction[]>([]);

  readonly auctions$ = this.auctionsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadAuctions().subscribe();
  }

  getAuctions(): Observable<Auction[]> {
    return this.auctions$;
  }

  loadAuctions(): Observable<Auction[]> {
    return this.http.get<any>(`${this.apiBase}?status=ALL&limit=80`, { withCredentials: true }).pipe(
      map((res) => (Array.isArray(res?.data) ? res.data : []).map(normalizeAuction)),
      tap((items) => this.auctionsSubject.next(items)),
      catchError(() => {
        this.auctionsSubject.next([]);
        return of([]);
      }),
    );
  }

  getSnapshot(): Auction[] {
    return this.auctionsSubject.value.map((item) => ({ ...item }));
  }

  getAuctionById(id: string): Observable<Auction | null> {
    return this.http.get<any>(`${this.apiBase}/${encodeURIComponent(id)}`, { withCredentials: true }).pipe(
      map((res) => (res?.data ? normalizeAuction(res.data) : null)),
      catchError(() => of(null)),
    );
  }

  getMinimumNextBid(auction: Auction): number {
    return Number(auction.currentBid || 0) + Number(auction.minIncrement || 1);
  }

  placeBid(id: string, amount: number): Observable<PlaceBidResult> {
    return this.http
      .post<any>(
        `${this.apiBase}/${encodeURIComponent(id)}/bids`,
        { amount: Math.floor(Number(amount || 0)) },
        { withCredentials: true },
      )
      .pipe(
        map((res) => ({
          ok: true,
          code: 'OK' as const,
          message: 'Příhoz byl přijat.',
          auction: normalizeAuction(res.data),
        })),
        tap((result) => {
          if (result.auction) this.upsertAuction(result.auction);
        }),
        catchError((err) =>
          of({
            ok: false,
            code: String(err?.error?.error?.code || 'NETWORK_ERROR') as PlaceBidResult['code'],
            message: String(err?.error?.error?.message || 'Příhoz se nepodařilo uložit.'),
          }),
        ),
      );
  }

  createAuction(input: CreateAuctionInput): Observable<PlaceBidResult> {
    return this.http.post<any>(this.apiBase, input, { withCredentials: true }).pipe(
      map((res) => ({
        ok: true,
        code: 'OK' as const,
        message: 'Aukce byla vytvořena a uložena do backendu.',
        auction: normalizeAuction(res.data),
      })),
      tap((result) => {
        if (result.auction) this.upsertAuction(result.auction);
      }),
      catchError((err) =>
        of({
          ok: false,
          code: String(err?.error?.error?.code || 'NETWORK_ERROR') as PlaceBidResult['code'],
          message: String(err?.error?.error?.message || 'Aukci se nepodařilo vytvořit.'),
        }),
      ),
    );
  }

  buyNow(id: string): Observable<PlaceBidResult> {
    return this.http
      .post<any>(`${this.apiBase}/${encodeURIComponent(id)}/buy-now`, {}, { withCredentials: true })
      .pipe(
        map((res) => ({
          ok: true,
          code: 'OK' as const,
          message: 'Položka byla koupena.',
          auction: normalizeAuction(res.data),
        })),
        tap((result) => {
          if (result.auction) this.upsertAuction(result.auction);
        }),
        catchError((err) =>
          of({
            ok: false,
            code: String(err?.error?.error?.code || 'NETWORK_ERROR') as PlaceBidResult['code'],
            message: String(err?.error?.error?.message || 'Kup teď se nepodařilo dokončit.'),
          }),
        ),
      );
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  /* TM_AUCTION_SOCIAL_FEED_EXPORT_V1 */
  toSocialFeedCard(auction: Auction): AuctionSocialFeedCard {
    const buyNowPriceLabel =
      auction.buyNowPrice == null ? null : this.formatMoney(auction.buyNowPrice);

    return {
      type: 'auction',
      source: 'trezzo-auctions',
      id: `auction_${auction.id}`,
      auctionId: auction.id,
      title: auction.title,
      subtitle: auction.subtitle,
      text: auction.description,
      imageUrl: auction.imageUrl,
      category: auction.category,
      sellerName: auction.seller.name,
      sellerLocation: auction.seller.location,
      currentBid: auction.currentBid,
      currentBidLabel: this.formatMoney(auction.currentBid),
      buyNowPrice: auction.buyNowPrice,
      buyNowPriceLabel,
      bidsCount: auction.bidsCount,
      watchers: auction.watchers,
      endsAt: auction.endTime.toISOString(),
      status: auction.status,
      href: `/auction/${auction.id}`,
      ctaLabel: auction.buyNowPrice ? 'Přihodit nebo koupit hned' : 'Přihodit do aukce',
    };
  }

  getSocialFeedSnapshot(): AuctionSocialFeedCard[] {
    return this.getSnapshot()
      .filter((auction) => auction.status !== 'DRAFT' && auction.status !== 'CANCELLED')
      .map((auction) => this.toSocialFeedCard(auction));
  }
  /* /TM_AUCTION_SOCIAL_FEED_EXPORT_V1 */

  private upsertAuction(auction: Auction): void {
    const items = this.auctionsSubject.value.slice();
    const idx = items.findIndex((item) => item.id === auction.id);

    if (idx >= 0) items[idx] = auction;
    else items.unshift(auction);

    this.auctionsSubject.next(items);
  }
}
