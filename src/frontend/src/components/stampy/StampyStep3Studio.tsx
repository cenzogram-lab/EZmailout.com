import { type StampyProps, useStampyId } from "./stampy";

/**
 * Stampy for Step 3 (design studio).
 *
 * Generated from `stampy-step-3.svg`. Clip-path and gradient ids are prefixed per
 * instance, so any number of these can share a page.
 */
export function StampyStep3Studio({ title, ...props }: StampyProps) {
  const uid = useStampyId();
  return (
    <svg
      viewBox="0 0 180 180"
      width={180}
      height={180}
      xmlns="http://www.w3.org/2000/svg"
      data-stampy="stampy-step-3"
      role="img"
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`${uid}-step-3-bodyClip`}>
          <path d="M124 390 C118 300 150 256 200 256 C250 256 282 300 276 390 Q200 404 124 390 Z" />
        </clipPath>
      </defs>
      <g transform="scale(0.45)">
        <g>
          <g
            stroke="#16204A"
            strokeWidth="6"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path
              d="M124 390 C118 300 150 256 200 256 C250 256 282 300 276 390 Q200 404 124 390 Z"
              fill="#FFFFFF"
            />
            <path
              d="M136 272 L160 262 L290 380 L262 396 Z"
              fill="#9C6B38"
              clipPath={`url(#${uid}-step-3-bodyClip)`}
            />
            <path
              d="M124 390 C118 300 150 256 200 256 C250 256 282 300 276 390 Q200 404 124 390 Z"
              fill="none"
            />
            <path
              d="M146 258 Q200 280 254 258 L236 300 Q200 334 164 300 Z"
              fill="#E5402A"
            />
            <rect
              x="187"
              y="290"
              width="26"
              height="30"
              fill="#FBF6EC"
              stroke="none"
            />
            <rect
              x="187"
              y="290"
              width="26"
              height="30"
              fill="none"
              stroke="#E5402A"
              strokeWidth="5"
              strokeDasharray="0 6.5"
            />
            <path
              d="M200 312 C192 306 191 300 196 298 C198 297 200 299 200 300 C200 299 202 297 204 298 C209 300 208 306 200 312 Z"
              fill="#E5402A"
              stroke="none"
            />
            <g transform="translate(252 304) rotate(-12)">
              <g
                stroke="#16204A"
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                <rect
                  x="0"
                  y="0"
                  width="46"
                  height="30"
                  rx="3"
                  fill="#FBF6EC"
                />
                <path d="M2 2 L23 17 L44 2" fill="none" strokeWidth="3.5" />
                <rect
                  x="33"
                  y="19"
                  width="9"
                  height="8"
                  fill="#E5402A"
                  stroke="none"
                />
              </g>
            </g>
            <g transform="translate(276 298) rotate(10)">
              <g
                stroke="#16204A"
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                <rect
                  x="0"
                  y="0"
                  width="46"
                  height="30"
                  rx="3"
                  fill="#FBF6EC"
                />
                <path d="M2 2 L23 17 L44 2" fill="none" strokeWidth="3.5" />
                <rect
                  x="33"
                  y="19"
                  width="9"
                  height="8"
                  fill="#E5402A"
                  stroke="none"
                />
              </g>
            </g>
            <rect
              x="248"
              y="318"
              width="72"
              height="54"
              rx="10"
              fill="#C89A63"
            />
            <path
              d="M248 330 Q248 318 260 318 L308 318 Q320 318 320 330 L320 342 Q284 354 248 342 Z"
              fill="#9C6B38"
            />
            <circle cx="284" cy="346" r="5" fill="#E5402A" strokeWidth="4" />
          </g>
        </g>
        <g>
          <g stroke="#16204A" strokeWidth="6" strokeLinejoin="round">
            <path
              d="M146 128 C120 112 96 116 90 128 C86 146 100 172 124 178 C132 160 140 144 150 138 Z"
              fill="#D9924A"
            />
            <path
              d="M254 128 C280 112 304 116 310 128 C314 146 300 172 276 178 C268 160 260 144 250 138 Z"
              fill="#D9924A"
            />
          </g>
        </g>
        <g>
          <g
            stroke="#16204A"
            strokeWidth="6"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path
              d="M200 96 C246 96 270 124 272 166 C274 214 250 258 200 258 C150 258 126 214 128 166 C130 124 154 96 200 96 Z"
              fill="#FFFFFF"
            />
            <path
              d="M212 150 C230 136 258 140 266 160 C270 182 260 200 242 202 C224 204 208 190 206 174 Z"
              fill="#D9924A"
              stroke="none"
            />
            <ellipse
              cx="158"
              cy="210"
              rx="11"
              ry="7"
              fill="#F4A38E"
              stroke="none"
              opacity="0.8"
            />
            <ellipse
              cx="244"
              cy="210"
              rx="11"
              ry="7"
              fill="#F4A38E"
              stroke="none"
              opacity="0.8"
            />
            <path d="M162 156 Q174 149 186 155" fill="none" strokeWidth="5" />
            <path d="M216 155 Q228 149 240 156" fill="none" strokeWidth="5" />
            <circle cx="174" cy="178" r="10" fill="#16204A" stroke="none" />
            <circle cx="228" cy="178" r="10" fill="#16204A" stroke="none" />
            <circle cx="177.5" cy="174" r="3.5" fill="#FFFFFF" stroke="none" />
            <circle cx="231.5" cy="174" r="3.5" fill="#FFFFFF" stroke="none" />
          </g>
        </g>
        <g
          transform="rotate(-10 200 230)"
          stroke="#16204A"
          strokeWidth="5"
          strokeLinejoin="round"
        >
          <rect
            x="96"
            y="224"
            width="156"
            height="13"
            rx="6.5"
            fill="#C89A63"
          />
          <rect x="250" y="221" width="24" height="19" rx="3" fill="#C7CAD8" />
          <path
            d="M274 221 Q304 220 320 230 Q304 241 274 240 Z"
            fill="#6366f1"
          />
        </g>
        <g>
          <g
            stroke="#16204A"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <ellipse cx="200" cy="216" rx="36" ry="25" fill="#FBF6EC" />
            <path
              d="M187 200 Q200 195 213 200 Q215 208 200 214 Q185 208 187 200 Z"
              fill="#16204A"
            />
            <ellipse
              cx="195"
              cy="201"
              rx="4"
              ry="2"
              fill="#FFFFFF"
              stroke="none"
            />
            <path
              d="M200 214 L200 222 M186 226 Q193 232 200 222 Q207 232 214 226"
              fill="none"
              strokeWidth="4.5"
            />
          </g>
        </g>
        <g
          transform="rotate(-10 204 96)"
          stroke="#16204A"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M206 70 L212 50" fill="none" />
          <path
            d="M134 124 C118 90 162 66 210 68 C258 70 286 96 268 124 Q200 138 134 124 Z"
            fill="#6366f1"
          />
          <path
            d="M140 116 Q200 128 262 116"
            fill="none"
            strokeWidth="4"
            opacity="0.6"
          />
          <path
            d="M170 84 Q186 76 204 76"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4"
            opacity="0.5"
          />
        </g>
        <g
          transform="rotate(-14 110 330)"
          stroke="#16204A"
          strokeWidth="5"
          strokeLinejoin="round"
        >
          <path
            d="M34 332 C34 294 88 280 140 290 C188 300 198 332 176 348 C160 360 150 346 136 354 C122 362 132 384 102 386 C62 388 34 364 34 332 Z"
            fill="#E3C49A"
            strokeWidth="6"
          />
          <circle cx="64" cy="322" r="12" fill="#6366f1" />
          <circle cx="94" cy="304" r="12" fill="#E5402A" />
          <circle cx="128" cy="302" r="11" fill="#22A06B" />
          <circle cx="68" cy="358" r="11" fill="#D9924A" />
          <circle cx="100" cy="340" r="10" fill="#F4F4F4" />
        </g>
        <g
          stroke="#16204A"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <ellipse cx="166" cy="362" rx="22" ry="18" fill="#FFFFFF" />
          <path
            d="M156 350 L156 360 M168 348 L168 358"
            fill="none"
            strokeWidth="4"
          />
        </g>
      </g>
    </svg>
  );
}
