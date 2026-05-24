import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { AuctionService, Auction } from '../../services/auction.service';
import { AuctionCardComponent } from '../auction-card/auction-card.component';

type AuctionFilter =
  | 'all'
  | 'endingSoon'
  | 'buyNow'
  | 'electronics'
  | 'collectibles'
  | 'highBid'
  | 'noBid';

type AuctionSort = 'ending' | 'newest' | 'priceAsc' | 'priceDesc' | 'bids' | 'watchers';

@Component({
  selector: 'app-auction-feed',
  imports: [CommonModule, AuctionCardComponent],
  templateUrl: './auction-feed.component.html',
  styleUrls: ['./auction-feed.component.scss'],
})
export class AuctionFeedComponent implements OnInit {
  auctions$!: Observable<Auction[]>;
  visibleAuctions$!: Observable<Auction[]>;

  private readonly filterSubject = new BehaviorSubject<AuctionFilter>('all');
  private readonly sortSubject = new BehaviorSubject<AuctionSort>('ending');
  private readonly querySubject = new BehaviorSubject<string>('');

  activeFilter: AuctionFilter = 'all';
  activeSort: AuctionSort = 'ending';
  searchQuery = '';

  readonly filters: { id: AuctionFilter; label: string; hint: string; icon: string }[] = [
    { id: 'all', label: 'Všechny aukce', hint: 'Kompletní výpis', icon: '🏠' },
    { id: 'endingSoon', label: 'Končí brzy', hint: 'Nejžhavější dražby', icon: '⏱️' },
    { id: 'buyNow', label: 'Kup teď', hint: 'Okamžitý nákup', icon: '⚡' },
    { id: 'electronics', label: 'Elektronika', hint: 'Konzole, mobily, HW', icon: '🎮' },
    { id: 'collectibles', label: 'Sběratelství', hint: 'Retro, limitky, rarity', icon: '🏆' },
    { id: 'highBid', label: 'Dražší položky', hint: 'Od 5 000 Kč', icon: '💎' },
    { id: 'noBid', label: 'Bez příhozu', hint: 'Šance levně začít', icon: '🧲' },
  ];

  readonly sortOptions: { id: AuctionSort; label: string }[] = [
    { id: 'ending', label: 'Nejdříve končí' },
    { id: 'newest', label: 'Nejnovější' },
    { id: 'priceAsc', label: 'Cena od nejnižší' },
    { id: 'priceDesc', label: 'Cena od nejvyšší' },
    { id: 'bids', label: 'Nejvíce příhozů' },
    { id: 'watchers', label: 'Nejsledovanější' },
  ];

  constructor(public auctionService: AuctionService) {}

  ngOnInit(): void {
    this.auctions$ = this.auctionService.getAuctions();

    this.visibleAuctions$ = combineLatest([
      this.auctions$,
      this.filterSubject,
      this.sortSubject,
      this.querySubject,
    ]).pipe(
      map(([auctions, filter, sort, query]) =>
        this.sortAuctions(this.filterAuctions(auctions, filter, query), sort),
      ),
    );
  }

  setFilter(filter: AuctionFilter): void {
    this.activeFilter = filter;
    this.filterSubject.next(filter);
  }

  setSort(sort: AuctionSort): void {
    this.activeSort = sort;
    this.sortSubject.next(sort);
  }

  setSearch(value: string): void {
    this.searchQuery = value || '';
    this.querySubject.next(this.searchQuery);
  }

  reload(): void {
    this.auctionService.loadAuctions().subscribe();
  }

  trackAuction(_index: number, auction: Auction): string {
    return auction.id;
  }

  countActive(auctions: Auction[] | null): number {
    return (auctions || []).filter((a) => !['ENDED', 'SOLD', 'CANCELLED'].includes(a.status)).length;
  }

  countEndingSoon(auctions: Auction[] | null): number {
    return (auctions || []).filter((a) => this.isEndingSoon(a)).length;
  }

  countWithBuyNow(auctions: Auction[] | null): number {
    return (auctions || []).filter((a) => !!a.buyNowPrice && !['SOLD', 'ENDED'].includes(a.status)).length;
  }

  private filterAuctions(auctions: Auction[], filter: AuctionFilter, query: string): Auction[] {
    const q = String(query || '').trim().toLowerCase();

    let active = auctions.filter(
      (auction) => auction.status !== 'ENDED' && auction.status !== 'CANCELLED',
    );

    if (q) {
      active = active.filter((auction) =>
        [
          auction.title,
          auction.subtitle,
          auction.description,
          auction.category,
          auction.seller?.name,
          auction.seller?.location,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }

    if (filter === 'endingSoon') return active.filter((auction) => this.isEndingSoon(auction));
    if (filter === 'buyNow') return active.filter((auction) => !!auction.buyNowPrice);
    if (filter === 'electronics') {
      return active.filter((auction) => auction.category.toLowerCase().includes('elektron'));
    }
    if (filter === 'collectibles') {
      return active.filter((auction) =>
        auction.category.toLowerCase().includes('sběratel') ||
        auction.category.toLowerCase().includes('sberatel'),
      );
    }
    if (filter === 'highBid') return active.filter((auction) => Number(auction.currentBid || 0) >= 5000);
    if (filter === 'noBid') return active.filter((auction) => Number(auction.bidsCount || 0) <= 0);

    return active;
  }

  private sortAuctions(auctions: Auction[], sort: AuctionSort): Auction[] {
    const list = [...auctions];

    if (sort === 'newest') return list.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
    if (sort === 'priceAsc') return list.sort((a, b) => a.currentBid - b.currentBid);
    if (sort === 'priceDesc') return list.sort((a, b) => b.currentBid - a.currentBid);
    if (sort === 'bids') return list.sort((a, b) => b.bidsCount - a.bidsCount);
    if (sort === 'watchers') return list.sort((a, b) => b.watchers - a.watchers);

    return list.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
  }

  private isEndingSoon(auction: Auction): boolean {
    const diff = auction.endTime.getTime() - Date.now();
    return diff > 0 && diff <= 1000 * 60 * 60 * 6;
  }
}
