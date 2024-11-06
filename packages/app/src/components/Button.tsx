import { FC } from "react";

interface ButtonProps {
  type: 'primary' | 'secondary' | 'info'
  text: string
  onClick: () => void
  disabled?: boolean
  fill?: boolean
  boldText?: boolean
  additionalClasses?: string
}

export const Button: FC<ButtonProps> = ({
  type,
  text,
  onClick,
  disabled=false,
  fill=true,
  boldText=true,
  additionalClasses='',
}) => {
  const baseButtonClassList = "rounded-full leading-[24px] transition-all duration-[300ms] ease-in-out"
  const primaryButtonClassList = "text-white bg-shrub-green-500 disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100"
  const primaryButtonHover = "hover:!bg-shrub-green-700"

  const secondaryButtonClassList = "text-shrub-grey-700 bg-white border"
  const secondaryButtonHover = "hover:bg-shrub-grey-light hover:border-shrub-grey-50"

  const infoButtonClassList = "text-shrub-grey-700 bg-white border border-shrub-grey-50"
  const infoButtonHover = "hover:bg-shrub-green-700 hover:text-white"

  const fillClassList = "w-full h-[59px] px-5 py-3"
  const boldClassList = "font-semibold"

  let buttonClassList = [baseButtonClassList]
  if(fill) {
    buttonClassList.push(fillClassList)
  }
  if(boldText) {
    buttonClassList.push(boldClassList)
  }

  if(type === 'primary') {
    buttonClassList.push(primaryButtonClassList)
    if(!disabled) {
      buttonClassList.push(primaryButtonHover)
    }
  } else if(type === 'secondary') {
    buttonClassList.push(secondaryButtonClassList)
    if(!disabled) {
      buttonClassList.push(secondaryButtonHover)
    }
  } else if(type === 'info') {
    buttonClassList.push(infoButtonClassList)
    if(!disabled) {
      buttonClassList.push(infoButtonHover)
    }
  }

  buttonClassList.push(additionalClasses)

  return (
    <button
      className={buttonClassList.join(' ')}
      disabled={disabled}
      onClick={onClick}
    >
      {text}
    </button>
  )
}