import './style.css';
import { Game } from './game/game';

const container = document.getElementById('app') ?? document.body;
const game = new Game(container as HTMLElement);

// expose a small read-only snapshot for debugging / automated smoke tests
;(window as { mero?: unknown }).mero = game;
