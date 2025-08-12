import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { ReactNode, useState } from "react";

interface InfoDialogProps {
  title: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}


const InfoDialog = ({ title, children, ...props }: InfoDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogTrigger>
        <Icon
          icon={HelpCircle}
          className="h-4 w-4 text-gray-700 hover:cursor-pointer"
        />
      </DialogTrigger>
      <DialogContent className="flex flex-col justify-start h-screen max-h-screen w-screen max-w-screen rounded-none px-3 sm:max-h-5/6 sm:max-w-5/6 sm:rounded-lg sm:p-6 xl:h-fit xl:max-h-3/4 xl:w-fit xl:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 grow-1 overflow-auto">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const StormRunoffInfo = () => (
  <InfoDialog
    title="Storm Runoff (from ERMiT run)"
  >
    <p>
      From the information given in the ERMiT Rainfall Event Rankings and Characteristics From Selected Storms table, it is possible to determine a number of attributes about the nature of the runoff. This example is from an ERMiT run for a severe wildfire using a hillside in a watershed in the Mica Creek Experimental Forest in Northern Idaho. The largest predicted storm runoff event from 100 years of stochastic climate on a severely burned hillslope was 88 mm from only 10.1 mm of precipitation on March 1 in year 97. As the runoff is greater than the precipitation, and it occurred in March, the user can assume that this was a rain-on-snow event, and a melting snowpack contributed more water to the runoff than was in the rainfall.
    </p>
    <p>
      If it is likely that the runoff event of concern occurred during a time when the soil was likely saturated, as it is during most rain-on-snow or snow-melt events, the user may want to increase the runoff amount to account for lateral flow. This can be estimated from the WEPP Windows water file for a run for the same climate and hillslope, with specifying a soil and cover to match the fire severity condition, and noting the lateral flow on the date of concern.
    </p>
    <p>
      Another approach is simply to increase the runoff amount by about 20 percent, a typical average value in a burned watershed.
    </p>
    <table className="w-full my-2">
      <thead>
        <tr>
          <th
            className="px-3 py-1 bg-gray-50 text-center font-semibold text-sm"
            colSpan={3}
          >
            100 - YEAR MEAN ANNUAL AVERAGES
          </th>
        </tr>
        <tr>
          <th></th>
          <th></th>
          <th
            className="px-3 py-1 bg-gray-50 font-semibold text-left text-sm"
          >
            Total in 100 years
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="px-3 py-1 text-right font-semibold">
            1147.96 mm
          </td>
          <td className="px-3 py-1">
            annual precipitation from
          </td>
          <td className="px-3 py-1">
            12098 storms
          </td>
        </tr>
        <tr>
          <td className="px-3 py-1 text-right font-semibold">
            18.64 mm
          </td>
          <td className="px-3 py-1">
            annual runoff from rainfall from
          </td>
          <td className="px-3 py-1">
            484 events
          </td>
        </tr>
        <tr>
          <td className="px-3 py-1 text-right font-semibold">
            17.96 mm
          </td>
          <td className="px-3 py-1">
            annual runoff from snowmelt or winter rainstorm from
          </td>
          <td className="px-3 py-1">
            245 events
          </td>
        </tr>
      </tbody>
    </table>
    <table className="border-collapse border border-gray-300 w-full my-4">
      <thead>
      <tr>
        <th
          className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm"
          colSpan={7}
        >
          Rainfall Event Rankings and Characteristics from the Selected Storms
        </th>
      </tr>
      <tr>
        <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
          Storm Rank<br/>(return interval)
        </th>
        <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
          Storm Runoff<br/>(mm)
        </th>
        <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
          Storm Precipitation<br/>(mm)
        </th>
        <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
          Storm Duration<br/>(h)
        </th>
        <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
          10-min Peak Rainfall Intensity<br/>(mm/h)
        </th>
        <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
          30-min Peak Rainfall Intensity<br/>(mm/h)
        </th>
        <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
          Storm Date
        </th>
      </tr>
      </thead>
      <tbody className="border border-gray-300">
      <tr>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">1</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">88.3</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">10.1</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">4.79</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">N/A</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">N/A</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">March 1<br/>year 97</td>
      </tr>
      <tr>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">5<br/>(20-year)</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">29.3</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.0</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.00</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">N/A</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">N/A</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">January 30<br/>year 22</td>
      </tr>
      <tr>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">10<br/>(10-year)</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">26.5</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">49.3</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">2.21</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">107.21</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">73.12</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">June 9<br/>year 74</td>
      </tr>
      <tr>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">20<br/>(5-year)</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">21.5</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.0</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.00</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">N/A</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">N/A</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">February 26<br/>year 75</td>
      </tr>
      <tr>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">50<br/>(2-year)</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">13.6</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">33.8</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">3.41</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">77.96</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">51.83</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">September 16<br/>year 87</td>
      </tr>
      <tr>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">75<br/>(1¼-year)</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">7.7</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">26.8</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">1.97</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">43.97</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">33.30</td>
        <td className="border border-gray-300 px-3 py-2 text-center text-sm">June 29<br/>year 3</td>
      </tr>
      </tbody>
    </table>
  </InfoDialog>
);

export const StormPrecipitationInfo = () => (
  <InfoDialog title="Storm precipitation (from ERMiT run)">
    <p>
      Use ERMiT storm amount as a surrogate for 24-h rainfall. The precipitation values is often chosen to be a 6-hr or 24-hr design storm that has a 1/10 (10 year return period) or a 1/20 (20 year return period) chance of happening any given year. If the runoff is from snowmelt, so that the runoff is potentially greater than the precipitation for the day, then it is recommended that a value for precipitation about twice the runoff amount be entered in the precipitation line.
    </p>
  </InfoDialog>
);

export const WatershedAreaInfo = () => (
  <InfoDialog title="Watershed area (from wepp.cloud)">
    <p>
      Watershed area above the structure of interest or watershed outlet. In the TR-55 method employed in this estimator, the peak flow rate is in direct proportion to the watershed area. Area can be estimated from maps with a planimeter or grid method. There are numerous GIS methods for estimating watershed area. The GeoWEPP ArcGIS wizard may be particularly beneficial because it can supplement the analysis procedure by estimating watershed area, provide sets of slope length and steepness values to enter into the ERMiT tool when used with the RMRS GeoWEPPer tool, or provide return period estimates of runoff that include lateral flow to use directly with the peak flow estimator.    </p>
  </InfoDialog>
);

export const WatershedFlowLengthInfo = () => (
  <InfoDialog title="Watershed flow length (from wepp.cloud)">
    <p>
      Watershed flow length is the horizontal distance from the top of the watershed to the structure or watershed outlet of interest. This distance should follow the flow path, and will not necessarily be a straight line. A GIS or a ruler and a scaled map will provide this estimate.
    </p>
    <p>
      L ~ 110 * A<sup>0.6</sup> for small watersheds (L in m, A in ha)
    </p>
  </InfoDialog>
);

export const AvgWatershedGradientInfo = () => (
  <InfoDialog title="Average watershed gradient (from wepp.cloud)">
    <p>
      Average watershed gradient can be estimated by dividing the difference in elevation at the top of the watershed and the elevation of the structure or watershed outlet of interest by the distance between the two.
    </p>
    <p>
      The average steepness of a watershed is estimated by measuring the flow length L from the highest point in the watershed to the point of interest downstream. Traditional mapping methods with a ruler or scale can be used, and a number of GIS methods are now available. The difference between the elevation at the highest point in the watershed and the watershed outlet is divided by the flow length to estimate an average watershed gradient <em>Sg</em>.
    </p>
  </InfoDialog>
);

export const CurveNumberInfo = ({
  curveNumberValue,
  setCurveNumberValue
}: {
  curveNumberValue: number;
  setCurveNumberValue: (value: number) => void;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const submitCurveNumberValue = (value: number) => {
    setCurveNumberValue(value);
    setDialogOpen(false);
  }

  return (
    <InfoDialog title="Curve number (Manual entry)" open={dialogOpen} onOpenChange={setDialogOpen}>
      <p>
        The curve number is based on the runoff Q and precipitation P numbers entered above. One estimate (which is likely larger than that generally recommended for forests) for CN is
      </p>
      <div className="flex flex-col items-center">
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow>
            <mi>CN</mi>
            <mo>∼</mo>
            <mfrac>
              <mn>25400</mn>
              <mrow>
                <mfrac>
                  <mrow>
                    <mn>0.4</mn>
                    <mo>⋅</mo>
                    <mi>P</mi>
                    <mo>+</mo>
                    <mn>0.8</mn>
                    <mo>⋅</mo>
                    <mi>Q</mi>
                    <mo>−</mo>
                    <msqrt>
                      <mrow>
                        <msup>
                          <mrow>
                            <mo>(</mo>
                            <mn>0.4</mn>
                            <mo>⋅</mo>
                            <mi>P</mi>
                            <mo>+</mo>
                            <mn>0.8</mn>
                            <mo>⋅</mo>
                            <mi>Q</mi>
                            <mo>)</mo>
                          </mrow>
                          <mn>2</mn>
                        </msup>
                        <mo>−</mo>
                        <mn>0.16</mn>
                        <mrow>
                          <mo>(</mo>
                          <msup>
                            <mi>P</mi>
                            <mn>2</mn>
                          </msup>
                          <mo>−</mo>
                          <mi>Q</mi>
                          <mo>⋅</mo>
                          <mi>P</mi>
                          <mo>)</mo>
                        </mrow>
                      </mrow>
                    </msqrt>
                  </mrow>
                  <mn>0.08</mn>
                </mfrac>
                <mo>+</mo>
                <mn>254</mn>
              </mrow>
            </mfrac>
            <mspace width="0.5em"/>
            <mtext> (P and Q in mm)</mtext>
          </mrow>
        </math>
      </div>
      <p>
        Further suggestions for Curve Numbers for forests are provided below.
      </p>
      <div className="flex flex-col gap-3 mt-2">
        <p>
          <strong>Curve Numbers for Forests</strong>
        </p>
        <table className="border border-gray-300 mx-4">
          <thead className="border border-gray-300">
            <tr>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-semibold">Burn severity</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-semibold">Post-fire condition</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-semibold">Cerrelli</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold">Story</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-semibold">Stuart</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-semibold">Kuyumjian</th>
            </tr>
          </thead>
          <tbody className="border border-gray-300">
          <tr>
            <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={2}>High</td>
            <td className="border border-gray-300 px-3 py-2">water repellent soil</td>
            <td className="border border-gray-300 px-3 py-2">94</td>
            <td className="border border-gray-300 px-3 py-2 text-center">93-98</td>
            <td className="border border-gray-300 px-3 py-2">-</td>
            <td className="border border-gray-300 px-3 py-2">95</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2">not water repellent</td>
            <td className="border border-gray-300 px-3 py-2">64-88<sup>a</sup></td>
            <td className="border border-gray-300 px-3 py-2 text-center">90-95</td>
            <td className="border border-gray-300 px-3 py-2">-</td>
            <td className="border border-gray-300 px-3 py-2">90-91</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={3}>Moderate</td>
            <td className="border border-gray-300 px-3 py-2">water repellent soil</td>
            <td className="border border-gray-300 px-3 py-2">94</td>
            <td className="border border-gray-300 px-3 py-2 text-center">-</td>
            <td className="border border-gray-300 px-3 py-2">80</td>
            <td className="border border-gray-300 px-3 py-2">90</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2">not water repellent</td>
            <td className="border border-gray-300 px-3 py-2">use cover type in Fair hydrologic condition</td>
            <td className="border border-gray-300 px-3 py-2 text-center">-</td>
            <td className="border border-gray-300 px-3 py-2">80</td>
            <td className="border border-gray-300 px-3 py-2">85</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2">treated</td>
            <td className="border border-gray-300 px-3 py-2">-</td>
            <td className="border border-gray-300 px-3 py-2 text-center">-</td>
            <td className="border border-gray-300 px-3 py-2">75<sup>b</sup></td>
            <td className="border border-gray-300 px-3 py-2">60-85<sup>c</sup></td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={3}>Low</td>
            <td className="border border-gray-300 px-3 py-2">water repellent soil</td>
            <td className="border border-gray-300 px-3 py-2">94</td>
            <td className="border border-gray-300 px-3 py-2 text-center">-</td>
            <td className="border border-gray-300 px-3 py-2">70-72</td>
            <td className="border border-gray-300 px-3 py-2">pre-fire CN + 5</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2">not water repellent</td>
            <td className="border border-gray-300 px-3 py-2">N,E slopes: use cover type in Good hydrologic condition<br/>
              S,W slopes: use cover type between Fair &amp; Good</td>
            <td className="border border-gray-300 px-3 py-2 text-center">-</td>
            <td className="border border-gray-300 px-3 py-2">70-72</td>
            <td className="border border-gray-300 px-3 py-2">pre-fire CN + 5</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2">treated</td>
            <td className="border border-gray-300 px-3 py-2">-</td>
            <td className="border border-gray-300 px-3 py-2 text-center">-</td>
            <td className="border border-gray-300 px-3 py-2">66<sup>b</sup></td>
            <td className="border border-gray-300 px-3 py-2">60-85<sup>c</sup></td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2 font-medium">Unburned</td>
            <td className="border border-gray-300 px-3 py-2"></td>
            <td className="border border-gray-300 px-3 py-2">N,E slopes: use cover type in Good hydrologic condition<br/>
              S,W slopes: use cover type between Fair &amp; Good</td>
            <td className="border border-gray-300 px-3 py-2 text-center">-</td>
            <td className="border border-gray-300 px-3 py-2">60-64</td>
            <td className="border border-gray-300 px-3 py-2">-</td>
          </tr>
          </tbody>
        </table>
        <div className="flex flex-col gap-2 mx-4 mt-1">
          <p><b><sup>a</sup></b> Hydrologic Soil Group A: 64; B: 78; C: 85; D: 88</p>
          <p><b><sup>b</sup></b> Combination of seeding, contour-felling, fencing, and road drainage</p>
          <p><b><sup>c</sup></b> Straw mulch with good coverage: 60;
            seeding with LEBs, 1 year post-fire: 75;
            LEBs without water repellant soil: 85</p>
        </div>
        <div className="flex flex-col gap-2 mx-4">
          <p>Cerrelli, G. A. 2005. FIRE HYDRO, a simplified method for predicting peak discharges to assist in the design of flood protection measures for western wildfires. In: Moglen, Glenn E., eds. Proceedings: 2005 watershed management conference-managing watersheds for human and natural impacts: engineering, ecological, and economic challenges; 2005 July 19-22; Williamsburg, VA. Alexandria, VA: American Society of Civil Engineers: 935-941.</p>
          <p>Kuyumjian, Greg. [Personal note]. Greg's Curve Number thoughts.</p>
          <p>Story, Mark. 2003. [E-mail circulation]. September. Stormflow methods.</p>
          <p>Stuart, Bo. 2000. Maudlow Fire, Burned Area Emergency Rehabilitation (BAER) plan. Townsend, MT: U.S. Department of Agriculture, Forest Service, Northern Region, Helena National Forest.</p>
        </div>
        <Separator orientation="horizontal" className="my-2" />
        <table className="border-collapse border border-gray-300 w-3/4">
          <thead>
            <tr>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm" colSpan={3}>
                Hydrologic condition
              </th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm" rowSpan={2}>
                Hydrologic soil condition
              </th>
            </tr>
            <tr>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">Poor</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">Fair</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">Good</th>
            </tr>
          </thead>
          <tbody>
          <tr>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(45)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                45
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(36)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                36
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(30)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                30
              </Button>
            </th>
            <td className="border border-gray-300 px-3 py-2 text-sm">
              <strong>Soils have a low runoff potential</strong> due to high infiltration rates. These soils consist primarily of deep, well-drained sands and gravels
            </td>
          </tr>
          <tr>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(66)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                66
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(60)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                60
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(55)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                55
              </Button>
            </th>
            <td className="border border-gray-300 px-3 py-2 text-sm">
              <strong>Soils have a moderately low runoff potential</strong> due to moderate infiltration rates. These soils consist primarily of moderately deep to deep, moderately well- to well-drained soils with moderately fine to moderately coarse textures.
            </td>
          </tr>
          <tr>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(77)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                77
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(73)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                73
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(70)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                70
              </Button>
            </th>
            <td className="border border-gray-300 px-3 py-2 text-sm">
              <strong>Soils have a moderately high runoff potential</strong> due to slow infiltration rates. These soils consist primarily of soils in which a layer exists near the surface that impedes the downward movement of water or soils with moderately fine to fine texture.
            </td>
          </tr>
          <tr>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(83)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                83
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(79)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                79
              </Button>
            </th>
            <th className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submitCurveNumberValue(77)}
                className="text-blue-600 hover:text-blue-800 underline"
                title="Click to transfer value to form"
              >
                77
              </Button>
            </th>
            <td className="border border-gray-300 px-3 py-2 text-sm">
              <strong>Soils have a high runoff potential</strong> due to very slow infiltration rates. These soils consist primarily of clays with high swelling potential, soils with permanently high water tables, soils with a clay pan or clay layer at or near the surface, and shallow soils over nearly impervious parent material.
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-2 text-sm" colSpan={4}>
              <div className="space-y-2">
                <div>
                  <strong>Poor:</strong> forest litter, small trees, and brush are destroyed by heavy grazing or regular burning.<br/>
                  <strong>Fair:</strong> forests are grazed, but not burned, and some forest litter covers the soil.<br/>
                  <strong>Good:</strong> forests are protected from grazing, and litter and brush adequately cover the soil.
                </div>
                <div className="text-xs mt-4">
                  Modified from: ISU 2008, Table 4, p. 9.
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
  </InfoDialog>
)};

export const TimeOfConcentrationInfo = () => (
  <InfoDialog title="Time of Concentration (Manual entry)">
    <p>
      Time of concentration, T<sub>c</sub>. The TR-55 approach estimates a property called the time of concentration for a watershed, the theoretical time it takes a drop of rainwater to travel from the top of the watershed to the watershed outlet. It can be as little as ten minutes, to several hours, depending on the size of the watershed. It is generally estimated with surface and channel velocity equations, or regression equations that are a function of watershed length and steepness. Watersheds with longer times of concentration will have lower peak flow rates for the same amount of total runoff.
    </p>
    <p>
      There are two options for this value. The default value is 10 hours, the maximum value that can be used in the regression equation to predict peak flow. This is the recommended value unless the watershed has a gradient less than 0.01 m/m (ft/ft) so that lateral flow is minimal, or the climate is dominated by high intensity summer storms on dry soils as may occur in the Southwestern U.S. For flat watersheds or high intensity storms on dry soils, a Tc value, shown in the right-hand column, is calculated by a regression equation (below) based on watershed length, slope steepness, and curve number (CN).
    </p>
    <div className="flex flex-col items-center">
      <math xmlns="http://www.w3.org/1998/Math/MathML">
        <mrow>
          <msub>
            <mi>T</mi>
            <mn>c</mn>
          </msub>
          <mo>∼</mo>
          <mfrac>
            <mrow>
              <msup>
                <mi>L</mi>
                <mn>0.8</mn>
              </msup>
              <mo>⋅</mo>
              <msup>
                <mrow>
                  <mo>(</mo>
                  <mfrac>
                    <mrow>
                      <mn>1000</mn>
                    </mrow>
                    <mi>CN</mi>
                  </mfrac>
                  <mo>−</mo>
                  <mn>9</mn>
                  <mo>)</mo>
                </mrow>
                <mn>0.7</mn>
              </msup>
            </mrow>
            <mrow>
              <mn>4407</mn>
              <mo>⋅</mo>
              <msup>
                <mi>Sg</mi>
                <mfrac>
                  <mn>1</mn>
                  <mn>2</mn>
                </mfrac>
              </msup>
            </mrow>
          </mfrac>
          <mspace width="0.5em"/>
          <mtext>hr</mtext>
        </mrow>
      </math>
    </div>
  </InfoDialog>
);

export const PondingAdjustmentFactorInfo = () => (
  <InfoDialog title="Ponding adjustment factor (Manual entry)">
    <p>
      The ponding adjustment factor is for standing water, bog, pond, or swamp.
    </p>
    <table className="border-collapse border border-gray-300 w-1/4">
      <thead>
        <tr>
          <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
            Percentage of pond/<br />swamp area
          </th>
          <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-center font-semibold text-sm">
            <i>Fp</i>
          </th>
        </tr>
      </thead>
      <tbody className="border border-gray-300">
        <tr>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.0</td>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">1.00</td>
        </tr>
        <tr>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.2</td>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.97</td>
        </tr>
        <tr>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">1.0</td>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.87</td>
        </tr>
        <tr>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">3.0</td>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.75</td>
        </tr>
        <tr>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">5.0</td>
          <td className="border border-gray-300 px-3 py-2 text-center text-sm">0.72</td>
        </tr>
      </tbody>
    </table>
  </InfoDialog>
)

export const CulvertDistanceInfo = () => (
  <InfoDialog title="Culvert distance (Manual entry)">
    <p>
      <strong><em>h</em></strong> is the distance from the center of the culvert to about 1 foot below the road surface (1 &lt; h &lt; 60)
    </p>
    <img src="/culvertgraphic.png" alt="Culvert height description diagram" className="w-fit mx-auto"/>
  </InfoDialog>
)