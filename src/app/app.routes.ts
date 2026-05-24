import { Routes } from '@angular/router';
import { AuctionDetailComponent } from './components/auction-detail/auction-detail.component';

export const routes: Routes = [
  {
    path: 'auction/:id',
    component: AuctionDetailComponent,
  },
];
