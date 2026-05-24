<template>
  <div class="app-loading" role="status" aria-label="Carregando aplicação">
    <!-- Skeleton: header -->
    <div class="sk-header">
      <div class="sk-header-brand">
        <div class="sk sk-logo-mark"></div>
        <div class="sk-brand-text">
          <div class="sk sk-text-lg"></div>
          <div class="sk sk-text-sm"></div>
        </div>
      </div>
      <div class="sk-header-actions">
        <div class="sk sk-btn-hd"></div>
        <div class="sk sk-btn-hd"></div>
        <div class="sk sk-btn-hd-primary"></div>
      </div>
    </div>
    <!-- Skeleton: nav tabs -->
    <div class="sk-nav">
      <div class="sk-nav-inner">
        <div class="sk sk-nav-tab"></div>
        <div class="sk sk-nav-tab sk-short"></div>
        <div class="sk sk-nav-tab sk-shorter"></div>
      </div>
    </div>
    <!-- Skeleton: page content -->
    <div class="sk-page container">
      <!-- Month tabs -->
      <div class="sk-month-row">
        <div v-for="i in 12" :key="i" class="sk sk-month-tab"></div>
      </div>
      <!-- Summary cards -->
      <div class="sk-cards-row">
        <div class="sk-card-sk"><div class="sk sk-card-lbl"></div><div class="sk sk-card-val"></div></div>
        <div class="sk-card-sk"><div class="sk sk-card-lbl"></div><div class="sk sk-card-val"></div></div>
        <div class="sk-card-sk"><div class="sk sk-card-lbl"></div><div class="sk sk-card-hint"></div><div class="sk sk-card-val sk-card-val-lg"></div></div>
        <div class="sk-card-sk"><div class="sk sk-card-lbl"></div><div class="sk sk-card-val"></div></div>
        <div class="sk-card-sk"><div class="sk sk-card-lbl"></div><div class="sk sk-card-hint"></div><div class="sk sk-card-val"></div></div>
      </div>
      <!-- Chart panel -->
      <div class="sk-chart-panel">
        <div class="sk-chart-hd">
          <div class="sk-chart-hd-left">
            <div class="sk sk-eyebrow"></div>
            <div class="sk sk-panel-title"></div>
          </div>
          <div class="sk-chart-highlights">
            <div class="sk sk-highlight-pill"></div>
            <div class="sk sk-highlight-pill"></div>
            <div class="sk sk-highlight-pill"></div>
          </div>
        </div>
        <div class="sk sk-chart-body"></div>
      </div>
      <!-- Lancamentos panels -->
      <div class="sk-panels-grid">
        <div class="sk-panel">
          <div class="sk-panel-hd">
            <div class="sk-panel-hd-left">
              <div class="sk sk-eyebrow"></div>
              <div class="sk sk-panel-title"></div>
            </div>
            <div class="sk sk-add-btn"></div>
          </div>
          <div class="sk-panel-rows">
            <div class="sk-secao-title-sk"><div class="sk sk-secao-lbl"></div><div class="sk sk-secao-val"></div></div>
            <div class="sk-row"><div class="sk sk-check"></div><div class="sk-row-desc"><div class="sk sk-row-name"></div><div class="sk sk-row-date"></div><div class="sk sk-row-tags"></div></div><div class="sk sk-row-valor"></div><div class="sk sk-row-acoes"></div></div>
            <div class="sk-row"><div class="sk sk-check"></div><div class="sk-row-desc"><div class="sk sk-row-name sk-w55"></div><div class="sk sk-row-date sk-w45"></div><div class="sk sk-row-tags sk-w35"></div></div><div class="sk sk-row-valor"></div><div class="sk sk-row-acoes"></div></div>
            <div class="sk-row"><div class="sk sk-check"></div><div class="sk-row-desc"><div class="sk sk-row-name sk-w70"></div><div class="sk sk-row-date sk-w40"></div></div><div class="sk sk-row-valor"></div><div class="sk sk-row-acoes"></div></div>
          </div>
        </div>
        <div class="sk-panel">
          <div class="sk-panel-hd">
            <div class="sk-panel-hd-left">
              <div class="sk sk-eyebrow"></div>
              <div class="sk sk-panel-title"></div>
            </div>
            <div class="sk sk-add-btn"></div>
          </div>
          <div class="sk-panel-rows">
            <div class="sk-secao-title-sk"><div class="sk sk-secao-lbl"></div><div class="sk sk-secao-val"></div></div>
            <div class="sk-row"><div class="sk sk-check"></div><div class="sk-row-desc"><div class="sk sk-row-name sk-w65"></div><div class="sk sk-row-date sk-w50"></div><div class="sk sk-row-tags sk-w30"></div></div><div class="sk sk-row-valor"></div><div class="sk sk-row-acoes"></div></div>
            <div class="sk-row"><div class="sk sk-check"></div><div class="sk-row-desc"><div class="sk sk-row-name sk-w50"></div><div class="sk sk-row-date sk-w40"></div><div class="sk sk-row-tags sk-w40"></div></div><div class="sk sk-row-valor"></div><div class="sk sk-row-acoes"></div></div>
            <div class="sk-secao-title-sk sk-mt-sm"><div class="sk sk-secao-lbl"></div><div class="sk sk-secao-val"></div></div>
            <div class="sk-row"><div class="sk sk-check"></div><div class="sk-row-desc"><div class="sk sk-row-name sk-w60"></div><div class="sk sk-row-date sk-w45"></div><div class="sk sk-row-tags sk-w25"></div></div><div class="sk sk-row-valor"></div><div class="sk sk-row-acoes"></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
