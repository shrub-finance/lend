import { ga4events } from "utils/ga4events"

interface InterestRateButtonProps {
  id: string
  rate: string
  selectedInterestRate: string
  setSelectedInterestRate: (string) => void
}

export const InterestRateButton: React.FC<InterestRateButtonProps> = ({
  id,
  rate,
  selectedInterestRate,
  setSelectedInterestRate,
}) => {
  return (
    <li className="mr-4" key={id}>
      <input
        type="radio"
        id={id}
        name="borrow"
        value={id}
        className="hidden peer"
        checked={rate === selectedInterestRate}
        onChange={() => {
          setSelectedInterestRate(rate);
          ga4events.depositInterest(rate);
        }}
        required
      />
      <label
        htmlFor={id}
        className="
          inline-flex
          items-center
          justify-center
          w-full
          px-4
          md:px-8
          lg:px-8
          py-3
          text-shrub-grey
          bg-white
          border
          border-shrub-grey-50
          rounded-lg
          cursor-pointer
          peer-checked:border-shrub-green-300
          peer-checked:bg-teal-50
          peer-checked:text-shrub-green-500
          hover:text-shrub-green
          hover:bg-teal-50
          select-none
          transition-all duration-[300ms] ease-in-out
        "
      >
        <div className="block">
          <div className="w-full text-lg font-semibold">
            {rate}%
          </div>
        </div>
      </label>
    </li>
  )
}