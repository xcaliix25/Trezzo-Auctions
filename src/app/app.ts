import { Component } from '@angular/core';
import { AuctionFeedComponent } from './components/auction-feed/auction-feed.component';
import { AuctionCreateEditorComponent } from './components/auction-create-editor/auction-create-editor.component';

@Component({
  selector: 'app-root',
  imports: [AuctionFeedComponent, AuctionCreateEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
