<?php
declare(strict_types=1);

final class Calculators
{
    /**
     * Menghitung pembagian harga bersih secara proporsional per item
     * dengan algoritma Largest Remainder (Hamilton-Hare) agar jumlah total pas persis tanpa selisih 1 rupiah.
     *
     * @param array<int, array{name: string, qty: int, raw_price: float}> $items
     * @return array{
     *   items: array<int, array{name: string, qty: int, raw_price: float, net_price: float, net_unit_price: float}>,
     *   subtotal: float,
     *   discount: float,
     *   delivery: float,
     *   service_tax: float,
     *   total_paid: float
     * }
     */
    public static function calculateProportionalSplit(
        array $items,
        float $subtotal,
        float $discount,
        float $delivery,
        float $serviceTax,
        float $totalPaid
    ): array {
        if (empty($items)) {
            return [
                'items' => [],
                'subtotal' => 0.0,
                'discount' => $discount,
                'delivery' => $delivery,
                'service_tax' => $serviceTax,
                'total_paid' => $totalPaid,
            ];
        }

        // Hitung total kotor riil dari item jika subtotal belum diisi
        $calculatedSubtotal = 0.0;
        foreach ($items as $it) {
            $calculatedSubtotal += (float)$it['raw_price'];
        }
        $subtotal = $subtotal > 0 ? $subtotal : $calculatedSubtotal;

        if ($subtotal <= 0) {
            // Jika subtotal 0, bagi rata totalPaid
            $n = count($items);
            $equalShare = floor($totalPaid / $n);
            $rem = (int)($totalPaid - ($equalShare * $n));

            $resultItems = [];
            foreach ($items as $idx => $it) {
                $qty = max(1, (int)($it['qty'] ?? 1));
                $net = $equalShare + ($idx < $rem ? 1.0 : 0.0);
                $resultItems[] = [
                    'name' => (string)$it['name'],
                    'qty' => $qty,
                    'raw_price' => (float)$it['raw_price'],
                    'net_price' => (float)$net,
                    'net_unit_price' => round($net / $qty, 2)
                ];
            }

            return [
                'items' => $resultItems,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'delivery' => $delivery,
                'service_tax' => $serviceTax,
                'total_paid' => $totalPaid,
            ];
        }

        // Kalkulasi proporsi pecahan dan sisa pembulatan (remainder)
        $allocations = [];
        $sumRounded = 0.0;

        foreach ($items as $idx => $it) {
            $rawPrice = (float)$it['raw_price'];
            $ratio = $rawPrice / $subtotal;
            $exactNet = $totalPaid * $ratio;
            $floorNet = floor($exactNet);
            $remainder = $exactNet - $floorNet;

            $allocations[] = [
                'idx' => $idx,
                'name' => (string)$it['name'],
                'qty' => max(1, (int)($it['qty'] ?? 1)),
                'raw_price' => $rawPrice,
                'net_price' => $floorNet,
                'remainder' => $remainder
            ];
            $sumRounded += $floorNet;
        }

        // Sisa rupiah yang perlu dibagikan ke item dengan remainder tertinggi
        $difference = (int)round($totalPaid - $sumRounded);

        // Urutkan berdasarkan remainder terbesar
        usort($allocations, fn($a, $b) => $b['remainder'] <=> $a['remainder']);

        for ($i = 0; $i < $difference; $i++) {
            $allocations[$i % count($allocations)]['net_price'] += 1.0;
        }

        // Kembalikan ke urutan asli index
        usort($allocations, fn($a, $b) => $a['idx'] <=> $b['idx']);

        $resultItems = [];
        foreach ($allocations as $alloc) {
            $qty = $alloc['qty'];
            $net = (float)$alloc['net_price'];
            $resultItems[] = [
                'name' => $alloc['name'],
                'qty' => $qty,
                'raw_price' => $alloc['raw_price'],
                'net_price' => $net,
                'net_unit_price' => round($net / $qty, 2)
            ];
        }

        return [
            'items' => $resultItems,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'delivery' => $delivery,
            'service_tax' => $serviceTax,
            'total_paid' => $totalPaid,
        ];
    }
}
