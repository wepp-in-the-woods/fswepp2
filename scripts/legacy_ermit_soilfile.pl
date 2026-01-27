#!/usr/bin/env perl
use strict;
use warnings;
use Getopt::Long;
use JSON::PP;

# Allow legacy ERMiT subs (from erm.pl) to use global variables.
no strict 'vars';

our $erm_pl = '/workdir/fswepp-docker/var/www/cgi-bin/fswepp/ermit/erm.pl';
our $s = 'lll';
our $k = 0;
our $SoilType = 'sand';
our $rfg = 20;
our $vegtype = 'forest';
our $shrub = 0;
our $grass = 0;
our $bare = 0;
our $soil_texture = 'sandy loam';

my $batch = 0;
my $input;

GetOptions(
    'erm-pl=s' => \$erm_pl,
    's=s' => \$s,
    'k=i' => \$k,
    'soil=s' => \$SoilType,
    'rfg=f' => \$rfg,
    'vegtype=s' => \$vegtype,
    'shrub=f' => \$shrub,
    'grass=f' => \$grass,
    'bare=f' => \$bare,
    'batch!' => \$batch,
    'input=s' => \$input,
) or die "usage: $0 --s <severity> --k <0..4> --soil <sand|silt|clay|loam> --rfg <0..100> --vegtype <forest|range|chaparral> [--shrub N --grass N --bare N] [--erm-pl path] [--batch --input path]\n";

# Load legacy subs from erm.pl so tests stay aligned with legacy implementation.
open my $fh, '<', $erm_pl or die "Unable to open $erm_pl: $!\n";
my $erm_text = do { local $/; <$fh> };
close $fh;

sub _extract_sub {
    my ($text, $name) = @_;
    my @lines = split /\n/, $text;
    my $in = 0;
    my $brace = 0;
    my @out;
    for my $line (@lines) {
        if (!$in) {
            next unless $line =~ /^sub\s+\Q$name\E\b/;
            $in = 1;
        }
        next unless $in;
        push @out, $line;
        $brace += () = $line =~ /\{/g;
        $brace -= () = $line =~ /\}/g;
        last if $brace == 0;
    }
    return join("\n", @out);
}

# Provide a minimal legacy-compatible error helper.
sub user_error { die @_; }

my $createsoilfile_src = _extract_sub($erm_text, 'createsoilfile');
my $soil_parameters_src = _extract_sub($erm_text, 'soil_parameters');
if (!$createsoilfile_src || !$soil_parameters_src) {
    die "Failed to extract legacy soil subs from $erm_pl\n";
}

eval $createsoilfile_src;
if ($@) { die "Failed to eval createsoilfile: $@\n"; }

eval $soil_parameters_src;
if ($@) { die "Failed to eval soil_parameters: $@\n"; }

sub _set_case_globals {
    my ($case) = @_;

    $SoilType = lc($case->{soil} // $SoilType);
    $vegtype = lc($case->{vegtype} // $vegtype);
    $s = lc($case->{s} // $s);
    $k = defined $case->{k} ? int($case->{k}) : $k;
    $rfg = defined $case->{rfg} ? $case->{rfg} : $rfg;
    $shrub = defined $case->{shrub} ? $case->{shrub} : $shrub;
    $grass = defined $case->{grass} ? $case->{grass} : $grass;
    $bare = defined $case->{bare} ? $case->{bare} : $bare;

    if ($SoilType !~ /^(sand|silt|clay|loam)$/) {
        die "Invalid soil type: $SoilType\n";
    }
    if ($vegtype !~ /^(forest|range|chaparral)$/) {
        die "Invalid vegtype: $vegtype\n";
    }
    if ($s !~ /^(lll|llh|lhl|lhh|hll|hlh|hhl|hhh|uuu)$/) {
        die "Invalid severity: $s\n";
    }
    if ($k < 0 || $k > 4) {
        die "Invalid k: $k\n";
    }

    # Map to legacy soil texture labels.
    $soil_texture = $SoilType;
    if ($SoilType eq 'clay') {
        $soil_texture = 'clay loam';
    } elsif ($SoilType eq 'silt') {
        $soil_texture = 'silt loam';
    } elsif ($SoilType eq 'sand') {
        $soil_texture = 'sandy loam';
    } elsif ($SoilType eq 'loam') {
        $soil_texture = 'loam';
    }
}

if ($batch) {
    $| = 1;
    my $json = JSON::PP->new->utf8->canonical(1);
    my $fh_in;
    if ($input) {
        open $fh_in, '<', $input or die "Unable to open input $input: $!\n";
    } else {
        $fh_in = *STDIN;
    }

    while (my $line = <$fh_in>) {
        chomp $line;
        next unless length $line;
        my $case = $json->decode($line);
        _set_case_globals($case);
        my $soil_text = createsoilfile();
        my $out = {
            s => $s,
            k => $k,
            soil => $SoilType,
            rfg => $rfg,
            vegtype => $vegtype,
            shrub => $shrub,
            grass => $grass,
            bare => $bare,
            soil_text => $soil_text,
        };
        print $json->encode($out), "\n";
    }
    if ($input) {
        close $fh_in;
    }
    exit 0;
}

_set_case_globals({});
print createsoilfile();
